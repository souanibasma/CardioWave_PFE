# utils/model_multiclass.py
# ============================================================
# ECGMulticlassNet  —  CD + HYP + IHD + WPW
#
# CHANGES vs previous version
# ────────────────────────────────────────────────────────────
# 1. WPW HEAD  (new)
#    – Dedicated single-neuron output for WPW detection.
#    – Shares the full backbone (morph + rhythm branches) so it
#      benefits from all learned morphology features.
#    – WPW_SNOMED = [74390002, 59931005, 195060002]
#
# 2. MI OVERPREDICTION  (improved)
#    – SharedBackbone now has a ContextGate between the two
#      branches: rhythm context suppresses spurious morph
#      activations. This is the main MI false-positive fix.
#    – IHD head uses higher dropout (0.50) + an extra BN layer
#      to prevent the head from memorising training noise.
#    – No rule-based logic — all learned.
#
# 3. ARCHITECTURE stays modular / backward-compatible:
#    – forward() still returns a dict; we just add key "wpw".
#    – All existing code that reads ["cd"], ["hyp"], ["ihd"]
#      is unaffected.
# ============================================================

import torch
import torch.nn as nn
import torch.nn.functional as F

# ─── Label metadata (unchanged) ──────────────────────────────────────────────

CD_NAMES  = ["LBBB", "RBBB", "BAV1", "BAV2", "BAV3", "LAFB"]
HYP_NAMES = ["LVH", "RVH", "RAE"]
IHD_NAMES = ["STD", "MI", "TWI", "QWAVE"]
WPW_NAME  = "WPW"                        # single neuron

CD_SIZE   = len(CD_NAMES)   # 6
HYP_SIZE  = len(HYP_NAMES)  # 3
IHD_SIZE  = len(IHD_NAMES)  # 4
WPW_SIZE  = 1

# SNOMED codes recognised as WPW — used in preprocessing
WPW_SNOMED = {74390002, 59931005, 195060002}

# Default decision thresholds (overridden by tune_threshold_multiclass.py)
DEFAULT_THRESHOLDS = {
    "LBBB": 0.40, "RBBB": 0.45, "BAV1": 0.45,
    "BAV2": 0.25, "BAV3": 0.30, "LAFB": 0.45,
    "LVH":  0.45, "RVH":  0.30, "RAE":  0.30,
    "STD":  0.45, "MI":   0.50, "TWI":  0.30, "QWAVE": 0.45,
    "WPW":  0.35,   # slightly permissive — rare class
}


# ─── Shared building blocks ───────────────────────────────────────────────────

class ResBlock1D(nn.Module):
    """Standard 1-D residual block with GELU + dropout."""

    def __init__(self, in_ch, out_ch, kernel=7, stride=1, dropout=0.15):
        super().__init__()
        pad = kernel // 2
        self.conv1 = nn.Conv1d(in_ch, out_ch, kernel, stride=stride,
                               padding=pad, bias=False)
        self.bn1   = nn.BatchNorm1d(out_ch)
        self.act   = nn.GELU()
        self.drop  = nn.Dropout(dropout)
        self.conv2 = nn.Conv1d(out_ch, out_ch, kernel, padding=pad, bias=False)
        self.bn2   = nn.BatchNorm1d(out_ch)
        self.skip  = (
            nn.Sequential(
                nn.Conv1d(in_ch, out_ch, 1, stride=stride, bias=False),
                nn.BatchNorm1d(out_ch),
            )
            if (in_ch != out_ch or stride != 1)
            else nn.Identity()
        )

    def forward(self, x):
        out = self.act(self.bn1(self.conv1(x)))
        out = self.drop(out)
        out = self.bn2(self.conv2(out))
        return self.act(out + self.skip(x))


class ChannelAttention(nn.Module):
    """Squeeze-and-Excitation style channel attention."""

    def __init__(self, channels, reduction=8):
        super().__init__()
        self.fc = nn.Sequential(
            nn.AdaptiveAvgPool1d(1),
            nn.Flatten(),
            nn.Linear(channels, max(1, channels // reduction)),
            nn.ReLU(),
            nn.Linear(max(1, channels // reduction), channels),
            nn.Sigmoid(),
        )

    def forward(self, x):
        return x * self.fc(x).unsqueeze(-1)


# ─── MorphologyCNN  ───────────────────────────────────────────────────────────

class MorphologyCNN(nn.Module):
    """
    Input  : (N, 12, 1250)  — 12 leads × 2.5 s
    Output : (N, 256)       — morphology embedding

    Captures QRS shape, delta waves (WPW), P-wave, Q-wave, ST/T contour.
    """

    def __init__(self):
        super().__init__()
        self.stem = nn.Sequential(
            nn.BatchNorm1d(12),
            nn.Conv1d(12, 64, kernel_size=15, padding=7, bias=False),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.MaxPool1d(2),          # → 625
        )
        self.layer1 = nn.Sequential(
            ResBlock1D(64, 64, 7), ResBlock1D(64, 64, 7), ChannelAttention(64)
        )
        self.layer2 = nn.Sequential(
            ResBlock1D(64, 128, 7, stride=2),   # → 313
            ResBlock1D(128, 128, 7),
            ChannelAttention(128),
        )
        self.layer3 = nn.Sequential(
            ResBlock1D(128, 256, 5, stride=2),  # → 157
            ResBlock1D(256, 256, 5),
            ChannelAttention(256),
        )
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.proj = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256, 256),
            nn.GELU(),
            nn.Dropout(0.3),
        )

    def forward(self, x):
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        return self.proj(self.pool(x))   # (N, 256)


# ─── RhythmCNN  ──────────────────────────────────────────────────────────────

class RhythmCNN(nn.Module):
    """
    Input  : (N, 1, 5000) — Lead II × 10 s
    Output : (N, 256)     — rhythm embedding

    Used as a CONTEXT signal to gate/suppress spurious morphology
    activations (main MI false-positive fix via ContextGate below).
    """

    def __init__(self):
        super().__init__()
        self.stem = nn.Sequential(
            nn.BatchNorm1d(1),
            nn.Conv1d(1, 32, kernel_size=25, padding=12, bias=False),
            nn.BatchNorm1d(32),
            nn.GELU(),
            nn.MaxPool1d(4),          # → 1250
        )
        self.layer1 = nn.Sequential(
            ResBlock1D(32, 32, 7), ResBlock1D(32, 32, 7), ChannelAttention(32)
        )
        self.layer2 = nn.Sequential(
            ResBlock1D(32, 64, 7, stride=2),    # → 625
            ResBlock1D(64, 64, 7),
            ChannelAttention(64),
        )
        self.layer3 = nn.Sequential(
            ResBlock1D(64, 128, 5, stride=2),   # → 313
            ResBlock1D(128, 128, 5),
            ChannelAttention(128),
        )
        self.layer4 = nn.Sequential(
            ResBlock1D(128, 256, 5, stride=2),  # → 157
            ResBlock1D(256, 256, 5),
            ChannelAttention(256),
        )
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.proj = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256, 256),
            nn.GELU(),
            nn.Dropout(0.3),
        )

    def forward(self, x):
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        return self.proj(self.pool(x))   # (N, 256)


# ─── ContextGate  ────────────────────────────────────────────────────────────

class ContextGate(nn.Module):
    """
    MI OVERPREDICTION FIX — learned, no rules.

    The rhythm branch carries strong evidence about whether a heartbeat
    pattern is globally ischaemic or an isolated noise artefact.
    This gate modulates the morphology embedding f_m with a
    per-dimension weight derived from the rhythm embedding f_r:

        gate   = sigmoid( W_r · f_r )       ∈ (0,1)^dim
        f_m'   = f_m ⊙ gate

    Why this helps MI:
    – True MI shows ST/Q changes AND rhythm-consistent ischaemic pattern.
    – Noise / baseline artefacts produce local morph activations but no
      corresponding rhythm context → gate suppresses them.
    – Learned purely from (morph, rhythm, label) triples, no heuristics.
    """

    def __init__(self, dim=256):
        super().__init__()
        self.gate_fc = nn.Sequential(
            nn.Linear(dim, dim),
            nn.Sigmoid(),
        )

    def forward(self, f_morph, f_rhythm):
        gate = self.gate_fc(f_rhythm)      # (N, 256)
        return f_morph * gate              # (N, 256) — gated morph


# ─── ECGMulticlassNet  ───────────────────────────────────────────────────────

class ECGMulticlassNet(nn.Module):
    """
    Multi-label ECG classifier.

    Outputs (all raw logits, apply sigmoid for probabilities):
        logits["cd"]  : (N, 6) — LBBB RBBB BAV1 BAV2 BAV3 LAFB
        logits["hyp"] : (N, 3) — LVH RVH RAE
        logits["ihd"] : (N, 4) — STD MI TWI QWAVE
        logits["wpw"] : (N, 1) — WPW  ← NEW

    Architecture changes:
        • ContextGate between morph and rhythm branches (MI fix)
        • IHD head: higher dropout (0.50) + extra BN (MI fix)
        • WPW head: shallow MLP on top of the gated morph embedding
          (delta waves are a purely morphological feature, so the
          non-gated morph embedding is used, not the fused one)
    """

    def __init__(self, dropout_fusion=0.4, dropout_ihd=0.50,
                 dropout_cd=0.3, dropout_hyp=0.3, dropout_wpw=0.3):
        super().__init__()

        # ── Branches ──────────────────────────────────────────
        self.morph_cnn  = MorphologyCNN()
        self.rhythm_cnn = RhythmCNN()

        # ── MI fix: rhythm gates the morph embedding ──────────
        self.context_gate = ContextGate(dim=256)

        # ── Fusion of gated-morph + rhythm → shared trunk ─────
        self.fusion = nn.Sequential(
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(dropout_fusion),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(dropout_fusion * 0.75),
        )

        # ── CD head ───────────────────────────────────────────
        self.head_cd = nn.Sequential(
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(dropout_cd),
            nn.Linear(64, CD_SIZE),
        )

        # ── HYP head ──────────────────────────────────────────
        self.head_hyp = nn.Sequential(
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(dropout_hyp),
            nn.Linear(64, HYP_SIZE),
        )

        # ── IHD head — higher dropout + extra BN (MI fix) ─────
        self.head_ihd = nn.Sequential(
            nn.Linear(128, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(dropout_ihd),          # 0.50 vs 0.30 before
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),               # extra BN — new
            nn.GELU(),
            nn.Dropout(dropout_ihd * 0.5),
            nn.Linear(64, IHD_SIZE),
        )

        # ── WPW head — uses raw morph embedding (pre-gate) ────
        # Delta waves are an early-activation morphology feature;
        # gating by rhythm is not required and could suppress them.
        self.head_wpw = nn.Sequential(
            nn.Linear(256, 64),
            nn.BatchNorm1d(64),
            nn.GELU(),
            nn.Dropout(dropout_wpw),
            nn.Linear(64, WPW_SIZE),
        )

        self._init_weights()

    # ── Weight initialisation ──────────────────────────────────
    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv1d):
                nn.init.kaiming_normal_(m.weight, mode="fan_out",
                                        nonlinearity="relu")
            elif isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    # ── Forward ───────────────────────────────────────────────
    def forward(self, morph, rhythm):
        """
        morph  : (N, 12, 1250)
        rhythm : (N,  1, 5000)
        """
        f_m = self.morph_cnn(morph)      # (N, 256)
        f_r = self.rhythm_cnn(rhythm)    # (N, 256)

        # WPW: raw morphology before any gating
        logit_wpw = self.head_wpw(f_m)   # (N, 1)

        # MI fix: rhythm context gates the morph embedding
        f_m_gated = self.context_gate(f_m, f_r)   # (N, 256)

        # Shared trunk (gated morph + rhythm)
        fused = self.fusion(torch.cat([f_m_gated, f_r], dim=1))  # (N, 128)

        return {
            "cd":  self.head_cd(fused),   # (N, 6)
            "hyp": self.head_hyp(fused),  # (N, 3)
            "ihd": self.head_ihd(fused),  # (N, 4)
            "wpw": logit_wpw,             # (N, 1)
        }

    def predict_proba(self, morph, rhythm):
        """Sigmoid probabilities (N, *) per head. No-grad wrapper."""
        with torch.no_grad():
            logits = self.forward(morph, rhythm)
            return {k: torch.sigmoid(v) for k, v in logits.items()}
