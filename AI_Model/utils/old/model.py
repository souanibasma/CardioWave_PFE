import torch
import torch.nn as nn


# ============================================================
# Residual Block 1D
# ============================================================

class ResBlock1D(nn.Module):
    """
    Residual block with two Conv1D layers.
    Handles channel change and downsampling automatically.
    """

    def __init__(self, in_ch, out_ch, kernel=7, stride=1, dropout=0.1):
        super().__init__()

        pad = kernel // 2

        self.conv = nn.Sequential(
            nn.Conv1d(in_ch, out_ch, kernel_size=kernel, stride=stride,
                      padding=pad, bias=False),
            nn.BatchNorm1d(out_ch),
            nn.ReLU(),
            nn.Dropout(dropout),

            nn.Conv1d(out_ch, out_ch, kernel_size=kernel, stride=1,
                      padding=pad, bias=False),
            nn.BatchNorm1d(out_ch),
        )

        # Projection if dimensions change
        if in_ch != out_ch or stride != 1:
            self.skip = nn.Sequential(
                nn.Conv1d(in_ch, out_ch, kernel_size=1,
                          stride=stride, bias=False),
                nn.BatchNorm1d(out_ch)
            )
        else:
            self.skip = nn.Identity()

        self.relu = nn.ReLU()

    def forward(self, x):
        return self.relu(self.conv(x) + self.skip(x))


# ============================================================
# ECGNet1D
# ============================================================

class ECGNet1D(nn.Module):
    """
    1D ResNet for 12-lead ECG binary classification.

    Input : (B, 12, 1000)
    Output: (B, 1)  — raw logits
    """

    def __init__(self, num_leads=12, num_classes=1, base_ch=64):
        super().__init__()

        # Stem
        self.stem = nn.Sequential(
            nn.Conv1d(num_leads, base_ch, kernel_size=15,
                      padding=7, bias=False),
            nn.BatchNorm1d(base_ch),
            nn.ReLU(),
            nn.MaxPool1d(kernel_size=3, stride=2, padding=1)  # 1000 → 500
        )

        # Residual tower
        self.layer1 = nn.Sequential(
            ResBlock1D(base_ch, base_ch, kernel=7, stride=1),
            ResBlock1D(base_ch, base_ch, kernel=7, stride=1),
        )

        self.layer2 = nn.Sequential(
            ResBlock1D(base_ch, base_ch * 2, kernel=7, stride=2),  # → 250
            ResBlock1D(base_ch * 2, base_ch * 2, kernel=7, stride=1),
        )

        self.layer3 = nn.Sequential(
            ResBlock1D(base_ch * 2, base_ch * 4, kernel=5, stride=2),  # → 125
            ResBlock1D(base_ch * 4, base_ch * 4, kernel=5, stride=1),
        )

        self.layer4 = nn.Sequential(
            ResBlock1D(base_ch * 4, base_ch * 8, kernel=5, stride=2),  # → 63
            ResBlock1D(base_ch * 8, base_ch * 8, kernel=5, stride=1),
        )

        self.global_pool = nn.AdaptiveAvgPool1d(1)

        self.head = nn.Sequential(
            nn.Linear(base_ch * 8, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        x = self.stem(x)
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.global_pool(x).squeeze(-1)
        return self.head(x)