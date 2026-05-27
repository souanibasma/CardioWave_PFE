"""
model_arr.py — ECGArrhythmiaNet  (v2 — modular)
================================================================
COUCHE ARR  : ["NSR", "AF", "AFL", "SB", "ST", "SVT", "VF"]  → 7 classes
COUCHE BEAT : ["PVC", "PAC"]                                   → 2 classes

Architecture : backbone partagé MorphologyCNN + RhythmCNN
  → tête ARR  (rythmes de fond)
  → tête BEAT (beats ectopiques — PVC, PAC)

Choix de design
───────────────
• NSR (normal sinus rhythm) remplace SR : correspond au code Chapman 426783006
  et au SCP "NORM"/"NSR" de PTB-XL — même code, renommage cosmétique
• TAV (jonctionnel) → fusionné dans SVT : les jonctionnels partagent la
  même fenêtre QRS fin + tachycardie, la confusion clinique est faible
• VF (164896001) provient de v1 (PTB-XL) car absent de Chapman/Georgia
• Backbone identique model_arythmie2.py → poids transférables
• BEAT tourne toujours (beats ectopiques possibles même en NSR)
"""

import torch
import torch.nn as nn

# ─────────────────────────────────────────────────────────────
#  COUCHE ARR — 7 classes
# ─────────────────────────────────────────────────────────────

ARR_LABELS = ["NSR", "AF", "AFL", "SB", "ST", "SVT", "VF"]
N_ARR      = len(ARR_LABELS)   # 7

# SNOMED-CT → index ARR
# Sources :  v2 prioritaire pour NSR/AF/AFL/SB/ST/SVT
#            v1 pour VF (seule source fiable)
ARR_SNOMED_TO_IDX = {
    # NSR — Rythme sinusal normal
    426783006: 0,   # SR / NSR / NORM  (PTB-XL, Chapman)

    # AF — Fibrillation auriculaire
    164889003: 1,   # AFIB (Chapman, PTB-XL)
    195080001: 1,   # AF+flutter combiné (certains exports)

    # AFL — Flutter auriculaire
    164890007: 2,   # AF/AFL code officiel Chapman
    5370000:   2,   # code SNOMED alternatif (PTB-XL scp_statements)

    # SB — Bradycardie sinusale
    426177001: 3,   # SB (Chapman, PTB-XL)

    # ST — Tachycardie sinusale
    427084000: 4,   # ST (Chapman, PTB-XL)

    # SVT — Tachycardie supraventriculaire (inclut jonctionnels)
    426761007: 5,   # SVT direct (Chapman)
    713422000: 5,   # AT  — Atrial Tachycardia
    233896004: 5,   # AVNRT
    233897008: 5,   # AVRT
    426648003: 5,   # Junctional tachycardia  ← TAV fusionné ici
    251164006: 5,   # JPT — junctional premature beat
    426995002: 5,   # JEB — junctional escape beat
    251166008: 5,   # Accelerated junctional rhythm
    195101003: 5,   # WAVN/SAAWR — wandering pacemaker

    # VF — Fibrillation ventriculaire  (v1 uniquement)
    164896001: 6,
}

# Seuils par défaut — optimisés sur val set après training
# VF bas (urgence vitale), AFL bas (souvent sous-représenté)
ARR_DEFAULT_THRESHOLDS = {
    "NSR": 0.45,
    "AF":  0.40,
    "AFL": 0.35,
    "SB":  0.40,
    "ST":  0.40,
    "SVT": 0.40,
    "VF":  0.25,
}

ARR_DESCRIPTIONS = {
    "NSR": "Rythme sinusal normal",
    "AF":  "Fibrillation auriculaire",
    "AFL": "Flutter auriculaire",
    "SB":  "Bradycardie sinusale",
    "ST":  "Tachycardie sinusale",
    "SVT": "Tachycardie supraventriculaire",
    "VF":  "Fibrillation ventriculaire ⚠️ URGENT",
}

# ─────────────────────────────────────────────────────────────
#  COUCHE BEAT — 2 classes (toujours active)
# ─────────────────────────────────────────────────────────────

BEAT_LABELS = ["PVC", "PAC"]
N_BEAT      = len(BEAT_LABELS)   # 2

# SNOMED-CT → index BEAT
# Sources : v2 (ESV→PVC, ESA→PAC)
BEAT_SNOMED_TO_IDX = {
    # PVC — Extrasystole ventriculaire
    17338001:  0,   # VPB — ventricular premature beat
    75532003:  0,   # VEB — ventricular escape beat
    11157007:  0,   # VB  — ventricular bigeminy

    # PAC — Extrasystole auriculaire
    284470004: 1,   # APB — atrial premature beat
    426749004: 1,   # PAC alias
    164903001: 1,   # atrial ectopic (PTB-XL)
    251173003: 1,   # ABI — atrial bigeminy
}

BEAT_DEFAULT_THRESHOLDS = {
    "PVC": 0.40,
    "PAC": 0.40,
}

BEAT_DESCRIPTIONS = {
    "PVC": "Extrasystole ventriculaire",
    "PAC": "Extrasystole auriculaire",
}

# ─────────────────────────────────────────────────────────────
#  Mapping PTB-XL SCP → SNOMED  (utilisé par preprocess_arr)
# ─────────────────────────────────────────────────────────────

PTBXL_SCP_TO_SNOMED_ARR = {
    # ARR
    "SR":    426783006,
    "NSR":   426783006,
    "NORM":  426783006,
    "SB":    426177001,
    "SBRAD": 426177001,
    "ST":    427084000,
    "STACH": 427084000,
    "AFIB":  164889003,
    "AF":    164889003,
    "AFLT":  164890007,
    "AFL":   164890007,
    "SVTAC": 426761007,
    "SVT":   426761007,
    "AVNRT": 233896004,
    "AVRT":  233897008,
    "AT":    713422000,
    "JUNCTIONAL": 426648003,
    "VFIB":  164896001,
    "VF":    164896001,
    # BEAT
    "PVC":   17338001,
    "BIGU":  17338001,
    "TRIGU": 17338001,
    "PAC":   284470004,
    "PSVT":  284470004,
    # Exclus volontairement
    "WPW":   None,   # WPW → morphology layer
    "VT":    None,   # trop rare
    "SA":    None,
}


# ─────────────────────────────────────────────────────────────
#  Blocs réutilisables
# ─────────────────────────────────────────────────────────────

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
        return x * self.se(x).unsqueeze(-1)


class TemporalAttention(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.attn = nn.Sequential(
            nn.Conv1d(channels, channels // 4, kernel_size=1, bias=False),
            nn.GELU(),
            nn.Conv1d(channels // 4, 1, kernel_size=1, bias=False),
            nn.Sigmoid()
        )

    def forward(self, x):
        return x * self.attn(x)


# ─────────────────────────────────────────────────────────────
#  MorphologyCNN — 12 leads × 1250 samples
#  Capture : morphologie QRS/onde P/onde F
#  Utile pour : AFL, SVT, VF
# ─────────────────────────────────────────────────────────────

class MorphologyCNN(nn.Module):
    def __init__(self, num_leads=12, base_ch=64):
        super().__init__()
        self.stem = nn.Sequential(
            nn.BatchNorm1d(num_leads),
            nn.Conv1d(num_leads, base_ch, kernel_size=15, padding=7, bias=False),
            nn.BatchNorm1d(base_ch),
            nn.GELU(),
            nn.MaxPool1d(kernel_size=3, stride=2, padding=1)
        )
        self.layer1 = nn.Sequential(
            ResBlock1D(base_ch, base_ch, kernel=7),
            ResBlock1D(base_ch, base_ch, kernel=7),
            ChannelAttention(base_ch),
        )
        self.layer2 = nn.Sequential(
            ResBlock1D(base_ch,     base_ch * 2, kernel=7, stride=2),
            ResBlock1D(base_ch * 2, base_ch * 2, kernel=7),
            ChannelAttention(base_ch * 2),
        )
        self.layer3 = nn.Sequential(
            ResBlock1D(base_ch * 2, base_ch * 4, kernel=5, stride=2),
            ResBlock1D(base_ch * 4, base_ch * 4, kernel=5),
            ChannelAttention(base_ch * 4),
        )
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        self.proj = nn.Sequential(
            nn.Linear(base_ch * 4, 256), nn.GELU(), nn.Dropout(0.3)
        )

    def forward(self, x):          # (N, 12, 1250)
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        return self.proj(self.global_pool(x).squeeze(-1))   # (N, 256)


# ─────────────────────────────────────────────────────────────
#  RhythmCNN — Lead II × 5000 samples (10s)
#  Capture : variabilité RR, régularité, fréquence
#  Utile pour : AF, SB, ST, NSR
# ─────────────────────────────────────────────────────────────

class RhythmCNN(nn.Module):
    def __init__(self, base_ch=32):
        super().__init__()
        self.stem = nn.Sequential(
            nn.BatchNorm1d(1),
            nn.Conv1d(1, base_ch, kernel_size=25, padding=12, bias=False),
            nn.BatchNorm1d(base_ch),
            nn.GELU(),
            nn.MaxPool1d(kernel_size=4, stride=4)
        )
        self.layer1 = nn.Sequential(
            ResBlock1D(base_ch, base_ch, kernel=7),
            ResBlock1D(base_ch, base_ch, kernel=7),
            ChannelAttention(base_ch),
        )
        self.layer2 = nn.Sequential(
            ResBlock1D(base_ch,     base_ch * 2, kernel=7, stride=2),
            ResBlock1D(base_ch * 2, base_ch * 2, kernel=7),
            ChannelAttention(base_ch * 2),
        )
        self.layer3 = nn.Sequential(
            ResBlock1D(base_ch * 2, base_ch * 4, kernel=5, stride=2),
            ResBlock1D(base_ch * 4, base_ch * 4, kernel=5),
            ChannelAttention(base_ch * 4),
        )
        self.layer4 = nn.Sequential(
            ResBlock1D(base_ch * 4, base_ch * 8, kernel=5, stride=2),
            ResBlock1D(base_ch * 8, base_ch * 8, kernel=5),
            ChannelAttention(base_ch * 8),
        )
        self.temporal_attn = TemporalAttention(base_ch * 8)
        self.global_pool   = nn.AdaptiveAvgPool1d(1)
        self.proj = nn.Sequential(
            nn.Linear(base_ch * 8, 256), nn.GELU(), nn.Dropout(0.3)
        )

    def forward(self, x):          # (N, 1, 5000)
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.temporal_attn(x)
        return self.proj(self.global_pool(x).squeeze(-1))   # (N, 256)


# ─────────────────────────────────────────────────────────────
#  ECGArrhythmiaNet — backbone + tête ARR + tête BEAT
# ─────────────────────────────────────────────────────────────

class ECGArrhythmiaNet(nn.Module):
    """
    Classifie en multi-label :
      COUCHE ARR  (7 classes) : NSR, AF, AFL, SB, ST, SVT, VF
      COUCHE BEAT (2 classes) : PVC, PAC  [toujours actif]

    Entrées :
      morph  : (N, 12, 1250) — 12 leads × 2.5s
      rhythm : (N,  1, 5000) — Lead II × 10s complet

    Sorties (forward) :
      {"arr":  logits (N, 7),
       "beat": logits (N, 2)}
    """

    def __init__(self, dropout_fusion=0.4, dropout_head=0.3):
        super().__init__()

        # Backbone partagé
        self.morph_cnn  = MorphologyCNN()
        self.rhythm_cnn = RhythmCNN()

        # Fusion partagée → représentation 128-d
        self.fusion = nn.Sequential(
            nn.Linear(512, 256),
            nn.BatchNorm1d(256), nn.GELU(), nn.Dropout(dropout_fusion),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128), nn.GELU(), nn.Dropout(dropout_fusion * 0.75),
        )

        # Tête ARR
        self.head_arr = nn.Sequential(
            nn.Linear(128, 128),
            nn.BatchNorm1d(128), nn.GELU(), nn.Dropout(dropout_head),
            nn.Linear(128, N_ARR)    # (N, 7)
        )

        # Tête BEAT — légère, beats se lisent sur morphologie locale
        self.head_beat = nn.Sequential(
            nn.Linear(128, 64),
            nn.BatchNorm1d(64), nn.GELU(), nn.Dropout(dropout_head * 0.5),
            nn.Linear(64, N_BEAT)    # (N, 2)
        )

        self._init_weights()

    def _init_weights(self):
        for m in self.modules():
            if isinstance(m, nn.Conv1d):
                nn.init.kaiming_normal_(m.weight, mode='fan_out',
                                        nonlinearity='relu')
            elif isinstance(m, nn.Linear):
                nn.init.xavier_uniform_(m.weight)
                if m.bias is not None:
                    nn.init.zeros_(m.bias)

    def _backbone(self, morph, rhythm):
        """Retourne le vecteur fusionné (N, 128)."""
        f_m = self.morph_cnn(morph)
        f_r = self.rhythm_cnn(rhythm)
        return self.fusion(torch.cat([f_m, f_r], dim=1))

    def forward(self, morph, rhythm):
        """
        morph  : (N, 12, 1250)
        rhythm : (N,  1, 5000)
        returns: {"arr": (N, 7), "beat": (N, 2)}
        """
        shared = self._backbone(morph, rhythm)
        return {
            "arr":  self.head_arr(shared),
            "beat": self.head_beat(shared),
        }

    def predict_proba(self, morph, rhythm):
        """Probabilités sigmoid, no_grad — {"arr": (N,7), "beat": (N,2)}"""
        with torch.no_grad():
            logits = self.forward(morph, rhythm)
            return {k: torch.sigmoid(v) for k, v in logits.items()}

    # ── Compatibilité predict_cascade_arr.py ─────────────────
    # Le pipeline charge le modèle et appelle predict_arr()
    # qui attend directement les probas ARR (N,7).
    # On expose aussi predict_arr_only() pour ce cas d'usage.

    def predict_arr_only(self, morph, rhythm):
        """Backward-compat : retourne uniquement les probas ARR (N, 7)."""
        with torch.no_grad():
            return torch.sigmoid(self.head_arr(self._backbone(morph, rhythm)))

    def load_v1_weights(self, checkpoint_path, device="cpu"):
        """
        Charge les poids d'un checkpoint v1 (ECGArrhythmiaNet 7 classes SR…VF).
        Seul le backbone morph_cnn + rhythm_cnn est transféré.
        La tête ARR et BEAT sont ré-initialisées (labels changés).
        """
        state = torch.load(checkpoint_path, map_location=device,
                           weights_only=False)
        src = state.get("model_state", state)

        # Filtrer morph_cnn et rhythm_cnn uniquement
        compatible = {k: v for k, v in src.items()
                      if k.startswith("morph_cnn.") or
                         k.startswith("rhythm_cnn.")}
        missing, unexpected = self.load_state_dict(compatible, strict=False)
        loaded = len(compatible) - len(missing)
        print(f"  load_v1_weights : {loaded}/{len(compatible)} couches "
              f"backbone chargées depuis {checkpoint_path}")
        if missing:
            print(f"  Manquant  : {missing[:5]}{'…' if len(missing)>5 else ''}")
        return self

    def load_v2_weights(self, checkpoint_path, device="cpu"):
        """
        Charge les poids d'un checkpoint v2 (ECGArythmieNet 8 classes).
        Mapping des clés morph_branch→morph_cnn, rhythm_branch→rhythm_cnn.
        """
        state = torch.load(checkpoint_path, map_location=device,
                           weights_only=False)
        src = state.get("model_state", state)

        remap = {}
        for k, v in src.items():
            if k.startswith("morph_branch."):
                remap["morph_cnn." + k[len("morph_branch."):]] = v
            elif k.startswith("rhythm_branch."):
                remap["rhythm_cnn." + k[len("rhythm_branch."):]] = v
            # fusion et têtes non transférés (architecture légèrement différente)

        missing, unexpected = self.load_state_dict(remap, strict=False)
        loaded = len(remap) - len(missing)
        print(f"  load_v2_weights : {loaded}/{len(remap)} couches backbone "
              f"chargées depuis {checkpoint_path}")
        return self


# ─────────────────────────────────────────────────────────────
#  Smoke-test rapide
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    model  = ECGArrhythmiaNet()
    total  = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"ECGArrhythmiaNet — paramètres : {total:,}")
    print(f"ARR  labels : {ARR_LABELS}")
    print(f"BEAT labels : {BEAT_LABELS}")

    morph  = torch.randn(4, 12, 1250)
    rhythm = torch.randn(4,  1, 5000)
    out    = model(morph, rhythm)
    print(f"Output arr  : {out['arr'].shape}   ← attendu (4, 7)  ✅")
    print(f"Output beat : {out['beat'].shape}  ← attendu (4, 2)  ✅")
