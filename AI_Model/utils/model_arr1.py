"""
model_arr.py — ECGArrhythmiaNet
7 classes : SR, SB, ST, AFIB, AFL, SVT, VF

Architecture : MorphologyCNN (12 leads) + RhythmCNN (Lead II complet)
- MorphologyCNN capture la morphologie QRS/P → utile AFL, SVT, VF
- RhythmCNN   capture la variabilité RR     → utile AFIB, SB, ST
"""

import torch
import torch.nn as nn

# ─────────────────────────────────────────────
#  Labels ARR — 7 classes
# ─────────────────────────────────────────────

ARR_LABELS = ["SR", "SB", "ST", "AFIB", "AFL", "SVT", "VF"]
ARR_SNOMED = {
    "SR":   426783006,   # Sinus rhythm (normal)
    "SB":   426177001,   # Sinus bradycardia
    "ST":   427084000,   # Sinus tachycardia
    "AFIB": 164889003,   # Atrial fibrillation
    "AFL":  164890007,   # Atrial flutter
    "SVT":  426761007,   # Supraventricular tachycardia
    "VF":   164896001,   # Ventricular fibrillation
}
ARR_SNOMED_TO_IDX = {v: i for i, (k, v) in enumerate(ARR_SNOMED.items())}
N_ARR = len(ARR_LABELS)   # 7

# Seuils par défaut (optimisés post-training sur val set)
# VF plus bas car urgence vitale — on préfère les faux positifs
ARR_DEFAULT_THRESHOLDS = {
    "SR":   0.45,
    "SB":   0.40,
    "ST":   0.40,
    "AFIB": 0.40,
    "AFL":  0.35,
    "SVT":  0.40,
    "VF":   0.25,
}

# Description clinique pour l'affichage
ARR_DESCRIPTIONS = {
    "SR":   "Rythme sinusal normal",
    "SB":   "Bradycardie sinusale",
    "ST":   "Tachycardie sinusale",
    "AFIB": "Fibrillation auriculaire",
    "AFL":  "Flutter auriculaire",
    "SVT":  "Tachycardie supraventriculaire",
    "VF":   "Fibrillation ventriculaire ⚠️ URGENT",
}

# Feature principale par classe (pour comprendre l'importance de chaque branche)
ARR_PRIMARY_FEATURE = {
    "SR":   "RR régulier + onde P normale",
    "SB":   "RR long régulier (>1s)",
    "ST":   "RR court régulier (<0.6s)",
    "AFIB": "Irrégularité RR + absence onde P",
    "AFL":  "Ondes F 300bpm (V1/Lead II)",
    "SVT":  "Tachycardie QRS fin",
    "VF":   "Signal chaotique toutes dérivations",
}


# ─────────────────────────────────────────────
#  Blocs réutilisables (identiques N0/N1)
# ─────────────────────────────────────────────

class ResBlock1D(nn.Module):
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
        self.skip  = nn.Sequential(
            nn.Conv1d(in_ch, out_ch, 1, stride=stride, bias=False),
            nn.BatchNorm1d(out_ch)
        ) if (in_ch != out_ch or stride != 1) else nn.Identity()

    def forward(self, x):
        out = self.act(self.bn1(self.conv1(x)))
        out = self.drop(out)
        out = self.bn2(self.conv2(out))
        return self.act(out + self.skip(x))


class ChannelAttention(nn.Module):
    def __init__(self, channels, reduction=8):
        super().__init__()
        self.fc = nn.Sequential(
            nn.AdaptiveAvgPool1d(1),
            nn.Flatten(),
            nn.Linear(channels, channels // reduction),
            nn.ReLU(),
            nn.Linear(channels // reduction, channels),
            nn.Sigmoid()
        )

    def forward(self, x):
        return x * self.fc(x).unsqueeze(-1)


# ─────────────────────────────────────────────
#  MorphologyCNN — 12 leads × 1250 samples
#  Capture : morphologie QRS, onde P, onde F
#  Utile pour : AFL, SVT, VF
# ─────────────────────────────────────────────

class MorphologyCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.stem = nn.Sequential(
            nn.BatchNorm1d(12),
            nn.Conv1d(12, 64, kernel_size=15, padding=7, bias=False),
            nn.BatchNorm1d(64), nn.GELU(), nn.MaxPool1d(2)  # →625
        )
        self.layer1 = nn.Sequential(
            ResBlock1D(64, 64, 7), ResBlock1D(64, 64, 7), ChannelAttention(64))
        self.layer2 = nn.Sequential(
            ResBlock1D(64, 128, 7, stride=2),               # →313
            ResBlock1D(128, 128, 7), ChannelAttention(128))
        self.layer3 = nn.Sequential(
            ResBlock1D(128, 256, 5, stride=2),              # →157
            ResBlock1D(256, 256, 5), ChannelAttention(256))
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.proj = nn.Sequential(
            nn.Flatten(), nn.Linear(256, 256), nn.GELU(), nn.Dropout(0.3))

    def forward(self, x):        # (N, 12, 1250)
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        return self.proj(self.pool(x))   # (N, 256)


# ─────────────────────────────────────────────
#  RhythmCNN — Lead II × 5000 samples (10s)
#  Capture : variabilité RR, fréquence, régularité
#  Utile pour : AFIB, SB, ST, SR
#
#  REMARQUE : on utilise le Lead II complet (5000 pts)
#  car les arythmies se lisent sur la durée — 10s de
#  Lead II = 8-15 cycles cardiaques visibles
# ─────────────────────────────────────────────

class RhythmCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.stem = nn.Sequential(
            nn.BatchNorm1d(1),
            nn.Conv1d(1, 32, kernel_size=25, padding=12, bias=False),
            nn.BatchNorm1d(32), nn.GELU(), nn.MaxPool1d(4)  # →1250
        )
        self.layer1 = nn.Sequential(
            ResBlock1D(32, 32, 7), ResBlock1D(32, 32, 7), ChannelAttention(32))
        self.layer2 = nn.Sequential(
            ResBlock1D(32, 64, 7, stride=2),                # →625
            ResBlock1D(64, 64, 7), ChannelAttention(64))
        self.layer3 = nn.Sequential(
            ResBlock1D(64, 128, 5, stride=2),               # →313
            ResBlock1D(128, 128, 5), ChannelAttention(128))
        self.layer4 = nn.Sequential(
            ResBlock1D(128, 256, 5, stride=2),              # →157
            ResBlock1D(256, 256, 5), ChannelAttention(256))
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.proj = nn.Sequential(
            nn.Flatten(), nn.Linear(256, 256), nn.GELU(), nn.Dropout(0.3))

    def forward(self, x):        # (N, 1, 5000)
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        return self.proj(self.pool(x))   # (N, 256)


# ─────────────────────────────────────────────
#  ECGArrhythmiaNet
# ─────────────────────────────────────────────

class ECGArrhythmiaNet(nn.Module):
    """
    Classifie 7 arythmies en multi-label :
      0  SR   — Rythme sinusal normal
      1  SB   — Bradycardie sinusale
      2  ST   — Tachycardie sinusale
      3  AFIB — Fibrillation auriculaire
      4  AFL  — Flutter auriculaire
      5  SVT  — Tachycardie supraventriculaire
      6  VF   — Fibrillation ventriculaire

    Entrées :
      morph  : (N, 12, 1250) — 12 leads × 2.5s
      rhythm : (N,  1, 5000) — Lead II × 10s complet

    Pourquoi les deux branches :
      MorphologyCNN → morphologie onde P/QRS (AFL, SVT, VF)
      RhythmCNN     → variabilité RR sur 10s  (AFIB, SB, ST, SR)
    """

    def __init__(self, dropout_fusion=0.4, dropout_head=0.3):
        super().__init__()
        self.morph_cnn  = MorphologyCNN()
        self.rhythm_cnn = RhythmCNN()

        self.fusion = nn.Sequential(
            nn.Linear(512, 256),
            nn.BatchNorm1d(256), nn.GELU(), nn.Dropout(dropout_fusion),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128), nn.GELU(), nn.Dropout(dropout_fusion * 0.75),
        )

        self.head_arr = nn.Sequential(
            nn.Linear(128, 128),
            nn.BatchNorm1d(128), nn.GELU(), nn.Dropout(dropout_head),
            nn.Linear(128, N_ARR)    # (N, 7)
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

    def forward(self, morph, rhythm):
        """
        morph  : (N, 12, 1250)
        rhythm : (N,  1, 5000)
        returns: logits (N, 7)
        """
        f_m = self.morph_cnn(morph)
        f_r = self.rhythm_cnn(rhythm)
        return self.head_arr(
            self.fusion(torch.cat([f_m, f_r], dim=1))
        )

    def predict_proba(self, morph, rhythm):
        """Retourne probabilités sigmoid (N, 7), no_grad"""
        with torch.no_grad():
            return torch.sigmoid(self.forward(morph, rhythm))