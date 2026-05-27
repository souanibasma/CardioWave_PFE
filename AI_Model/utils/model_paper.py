import torch
import torch.nn as nn
import torch.nn.functional as F


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


class MorphologyCNN(nn.Module):
    def __init__(self, num_leads=12, base_ch=64):
        super().__init__()
        self.stem = nn.Sequential(
            nn.BatchNorm1d(num_leads),
            nn.Conv1d(num_leads, base_ch, kernel_size=15, padding=7, bias=False),
            nn.BatchNorm1d(base_ch),
            nn.GELU(),
            nn.MaxPool1d(kernel_size=3, stride=2, padding=1)  # 1250→625
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
        return self.proj(x)


class RhythmCNN(nn.Module):
    def __init__(self, base_ch=32):
        super().__init__()
        self.stem = nn.Sequential(
            nn.BatchNorm1d(1),
            nn.Conv1d(1, base_ch, kernel_size=25, padding=12, bias=False),
            nn.BatchNorm1d(base_ch),
            nn.GELU(),
            nn.MaxPool1d(kernel_size=4, stride=4)  # 5000→1250
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
        return self.proj(x)


class ECGDualBranchNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.morph_branch  = MorphologyCNN()
        self.rhythm_branch = RhythmCNN()
        self.fusion = nn.Sequential(
            nn.Linear(512, 256),
            nn.BatchNorm1d(256),
            nn.GELU(),
            nn.Dropout(0.4),
            nn.Linear(256, 128),
            nn.BatchNorm1d(128),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(128, 1)
        )

    def forward(self, morph, rhythm):
        f_morph  = self.morph_branch(morph)
        f_rhythm = self.rhythm_branch(rhythm)
        fused    = torch.cat([f_morph, f_rhythm], dim=1)
        return self.fusion(fused)