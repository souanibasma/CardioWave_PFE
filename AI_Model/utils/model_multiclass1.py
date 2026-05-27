# utils/model_multiclass.py
# ============================================================
# ECGMulticlassNet — backbone partagé + 3 têtes multi-label
#
# Architecture :
#   MorphologyCNN  (identique à model_paper.py) → 256-dim
#   RhythmCNN      (identique à model_paper.py) → 256-dim
#   Fusion MLP     → shared_features 256-dim
#   Head CD        → 6 logits  (LBBB, RBBB, BAV1, BAV2, BAV3, LAFB)
#   Head HYP       → 3 logits  (LVH, RVH, RAE)
#   Head IHD       → 4 logits  (STD, MI, TWI, QWAVE)
#
# Input  : morph  (N, 12, 1250)  +  rhythm (N, 1, 5000)
# Output : dict {"cd": (N,6), "hyp": (N,3), "ihd": (N,4)}  — raw logits
# ============================================================

import torch
import torch.nn as nn
import sys, os

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from config import CD_SIZE, HYP_SIZE, IHD_SIZE

# ============================================================
# BLOCS DE BASE — copiés à l'identique depuis model_paper.py
# ============================================================

class ResBlock1D(nn.Module):
    def __init__(self, in_ch, out_ch, kernel=7, stride=1, dropout=0.15):
        super().__init__()
        pad = kernel // 2
        self.conv = nn.Sequential(
            nn.Conv1d(in_ch, out_ch, kernel_size=kernel, stride=stride,
                      padding=pad, bias=False),
            nn.BatchNorm1d(out_ch),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Conv1d(out_ch, out_ch, kernel_size=kernel, stride=1,
                      padding=pad, bias=False),
            nn.BatchNorm1d(out_ch),
        )
        self.skip = nn.Sequential(
            nn.Conv1d(in_ch, out_ch, kernel_size=1, stride=stride, bias=False),
            nn.BatchNorm1d(out_ch)
        ) if (in_ch != out_ch or stride != 1) else nn.Identity()
        self.act = nn.GELU()

    def forward(self, x):
        return self.act(self.conv(x) + self.skip(x))


class ChannelAttention(nn.Module):
    """Squeeze-and-Excitation channel attention."""
    def __init__(self, channels, reduction=8):
        super().__init__()
        self.se = nn.Sequential(
            nn.AdaptiveAvgPool1d(1),
            nn.Flatten(),
            nn.Linear(channels, channels // reduction),
            nn.ReLU(),
            nn.Linear(channels // reduction, channels),
            nn.Sigmoid()
        )

    def forward(self, x):
        w = self.se(x).unsqueeze(-1)
        return x * w


# ============================================================
# BRANCHES — identiques à model_paper.py
# ============================================================

class MorphologyCNN(nn.Module):
    """
    Branche morphologie — identique à model_paper.py.
    Input  : (N, 12, 1250)
    Output : (N, 256)
    """
    def __init__(self, num_leads=12, base_ch=64):
        super().__init__()
        self.stem = nn.Sequential(
            nn.BatchNorm1d(num_leads),
            nn.Conv1d(num_leads, base_ch, kernel_size=15, padding=7, bias=False),
            nn.BatchNorm1d(base_ch),
            nn.GELU(),
            nn.MaxPool1d(kernel_size=3, stride=2, padding=1)   # 1250→625
        )
        self.layer1 = nn.Sequential(
            ResBlock1D(base_ch,     base_ch,     kernel=7, stride=1),
            ResBlock1D(base_ch,     base_ch,     kernel=7, stride=1),
            ChannelAttention(base_ch),
        )
        self.layer2 = nn.Sequential(
            ResBlock1D(base_ch,     base_ch * 2, kernel=7, stride=2),  # →313
            ResBlock1D(base_ch * 2, base_ch * 2, kernel=7, stride=1),
            ChannelAttention(base_ch * 2),
        )
        self.layer3 = nn.Sequential(
            ResBlock1D(base_ch * 2, base_ch * 4, kernel=5, stride=2),  # →157
            ResBlock1D(base_ch * 4, base_ch * 4, kernel=5, stride=1),
            ChannelAttention(base_ch * 4),
        )
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        self.proj = nn.Sequential(
            nn.Linear(base_ch * 4, 256),
            nn.GELU(),
            nn.Dropout(0.3)
        )

    def forward(self, x):
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.global_pool(x).squeeze(-1)
        return self.proj(x)   # (N, 256)


class RhythmCNN(nn.Module):
    """
    Branche rythme — identique à model_paper.py.
    Input  : (N, 1, 5000)
    Output : (N, 256)
    """
    def __init__(self, base_ch=32):
        super().__init__()
        self.stem = nn.Sequential(
            nn.BatchNorm1d(1),
            nn.Conv1d(1, base_ch, kernel_size=25, padding=12, bias=False),
            nn.BatchNorm1d(base_ch),
            nn.GELU(),
            nn.MaxPool1d(kernel_size=4, stride=4)   # 5000→1250
        )
        self.layer1 = nn.Sequential(
            ResBlock1D(base_ch,     base_ch,     kernel=7, stride=1),
            ResBlock1D(base_ch,     base_ch,     kernel=7, stride=1),
            ChannelAttention(base_ch),
        )
        self.layer2 = nn.Sequential(
            ResBlock1D(base_ch,     base_ch * 2, kernel=7, stride=2),  # →625
            ResBlock1D(base_ch * 2, base_ch * 2, kernel=7, stride=1),
            ChannelAttention(base_ch * 2),
        )
        self.layer3 = nn.Sequential(
            ResBlock1D(base_ch * 2, base_ch * 4, kernel=5, stride=2),  # →313
            ResBlock1D(base_ch * 4, base_ch * 4, kernel=5, stride=1),
            ChannelAttention(base_ch * 4),
        )
        self.layer4 = nn.Sequential(
            ResBlock1D(base_ch * 4, base_ch * 8, kernel=5, stride=2),  # →157
            ResBlock1D(base_ch * 8, base_ch * 8, kernel=5, stride=1),
            ChannelAttention(base_ch * 8),
        )
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        self.proj = nn.Sequential(
            nn.Linear(base_ch * 8, 256),
            nn.GELU(),
            nn.Dropout(0.3)
        )

    def forward(self, x):
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.global_pool(x).squeeze(-1)
        return self.proj(x)   # (N, 256)


# ============================================================
# TÊTE DE CLASSIFICATION — partagée entre CD, HYP, IHD
# ============================================================

class ClassificationHead(nn.Module):
    """
    MLP léger branché sur les shared_features.
    Input  : (N, 256)
    Output : (N, num_classes) — logits bruts (pas de sigmoid)
    """
    def __init__(self, in_features: int, num_classes: int, dropout: float = 0.3):
        super().__init__()
        self.head = nn.Sequential(
            nn.Linear(in_features, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        return self.head(x)   # (N, num_classes)


# ============================================================
# MODÈLE PRINCIPAL
# ============================================================

class ECGMulticlassNet(nn.Module):
    """
    Backbone partagé MorphologyCNN + RhythmCNN
    + fusion MLP commun
    + 3 têtes indépendantes multi-label (CD, HYP, IHD).

    Forward retourne un dict de logits bruts :
        {
            "cd"  : (N, CD_SIZE),   # 6 classes
            "hyp" : (N, HYP_SIZE),  # 3 classes
            "ihd" : (N, IHD_SIZE),  # 4 classes
        }
    Appliquer torch.sigmoid() sur chaque sortie pour obtenir des probabilités.
    La loss utilisée doit être BCEWithLogitsLoss (pas BCELoss).
    """

    def __init__(self):
        super().__init__()

        # ── Branches (identiques au modèle binaire) ──────────
        self.morph_branch  = MorphologyCNN()   # → (N, 256)
        self.rhythm_branch = RhythmCNN()       # → (N, 256)

        # ── Fusion partagée ──────────────────────────────────
        # Même structure que ECGDualBranchNet.fusion,
        # sauf la dernière couche (pas de Linear(128,1) ici)
        self.fusion = nn.Sequential(
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(0.4),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(0.3),
        )
        # shared_features dim = 128

        # ── Têtes de classification ───────────────────────────
        self.head_cd  = ClassificationHead(128, CD_SIZE)   # 6 logits
        self.head_hyp = ClassificationHead(128, HYP_SIZE)  # 3 logits
        self.head_ihd = ClassificationHead(128, IHD_SIZE)  # 4 logits

    def forward(self, morph, rhythm):
        """
        Args:
            morph  : (N, 12, 1250)
            rhythm : (N,  1, 5000)
        Returns:
            dict avec clés "cd", "hyp", "ihd" — chacun (N, num_classes) logits
        """
        f_morph  = self.morph_branch(morph)          # (N, 256)
        f_rhythm = self.rhythm_branch(rhythm)        # (N, 256)
        fused    = torch.cat([f_morph, f_rhythm], dim=1)  # (N, 512)
        shared   = self.fusion(fused)                # (N, 128)

        return {
            "cd"  : self.head_cd(shared),    # (N, 6)
            "hyp" : self.head_hyp(shared),   # (N, 3)
            "ihd" : self.head_ihd(shared),   # (N, 4)
        }

    def predict_proba(self, morph, rhythm):
        """
        Comme forward() mais retourne des probabilités (sigmoid appliqué).
        À utiliser à l'inférence, pas pendant l'entraînement.
        """
        logits = self.forward(morph, rhythm)
        return {k: torch.sigmoid(v) for k, v in logits.items()}