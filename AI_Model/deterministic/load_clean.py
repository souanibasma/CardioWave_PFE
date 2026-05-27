"""
ECG Pipeline — STEP 1: Signal Loading + Cleaning
=================================================
Goal:
  - Load .npy ECG files
  - Understand signal shape and structure
  - Select the correct lead
  - Apply basic signal cleaning using NeuroKit2
  - Visualize raw vs. cleaned signal

Sampling rate: 500 Hz
"""

import numpy as np
import neurokit2 as nk
import matplotlib.pyplot as plt
import os

# ─────────────────────────────────────────────
# CONFIGURATION — Edit these paths
# ─────────────────────────────────────────────
ECG_FILES = [
    "data/1.npy",
    "data/2.npy",
    "data/3.npy",
    "data/4.npy",
    "data/5.npy",
    "data/6.npy",
    "data/7.npy",
    "data/8.npy",
    "data/9.npy",
    "data/10.npy",
    # Add all your 10 files here
]

SAMPLING_RATE = 500  # Hz — do NOT change unless confirmed otherwise

# For multi-lead signals: which lead index to use?
# Standard 12-lead order: [I, II, III, aVR, aVL, aVF, V1, V2, V3, V4, V5, V6]
# Lead II (index 1) is preferred for rhythm analysis.
# We will auto-detect and ask you to confirm.
PREFERRED_LEAD_INDEX = 1  # Lead II — change if needed


# ─────────────────────────────────────────────
# STEP 1A: Load and inspect the signal
# ─────────────────────────────────────────────
def load_and_inspect(filepath):
    """
    Load a .npy file and print a full diagnostic report.
    Returns: (signal_1d, signal_raw) — cleaned 1D lead + original array
    """
    print("=" * 60)
    print(f"FILE: {os.path.basename(filepath)}")
    print("=" * 60)

    # Load
    raw = np.load(filepath)
    print(f"  Shape        : {raw.shape}")
    print(f"  Dtype        : {raw.dtype}")
    print(f"  Min / Max    : {raw.min():.4f} / {raw.max():.4f}")
    print(f"  Mean / Std   : {raw.mean():.4f} / {raw.std():.4f}")

    # ── Detect shape and extract 1D lead ──
    signal_1d = extract_lead(raw)

    # Duration
    duration_sec = len(signal_1d) / SAMPLING_RATE
    print(f"  Duration     : {duration_sec:.2f} seconds")
    print(f"  Samples      : {len(signal_1d)}")

    # Sanity checks
    print("\n  🔍 Sanity checks:")
    if duration_sec < 5:
        print("  ⚠️  WARNING: Signal shorter than 5 seconds — may be too short for reliable analysis.")
    else:
        print(f"  ✅ Duration OK ({duration_sec:.1f}s ≥ 5s)")

    amp_range = raw.max() - raw.min()
    if amp_range < 0.1:
        print(f"  ⚠️  WARNING: Amplitude range very small ({amp_range:.4f}) — signal may be in raw ADC counts or millivolts need scaling.")
    elif amp_range > 50:
        print(f"  ⚠️  WARNING: Amplitude range very large ({amp_range:.2f}) — may be raw ADC units, not mV.")
    else:
        print(f"  ✅ Amplitude range looks reasonable ({amp_range:.4f})")

    return signal_1d, raw


def extract_lead(raw):
    """
    Intelligently extract a single 1D lead from any array shape.
    Handles:
      - 1D array → single lead, use directly
      - 2D (leads × samples) → pick PREFERRED_LEAD_INDEX row
      - 2D (samples × leads) → pick PREFERRED_LEAD_INDEX column
    """
    if raw.ndim == 1:
        print(f"  Layout       : Single-lead signal")
        return raw.astype(float)

    elif raw.ndim == 2:
        rows, cols = raw.shape

        # Heuristic: the longer dimension = samples
        if rows > cols:
            # Shape: (samples × leads)
            print(f"  Layout       : Multi-lead — shape (samples={rows} × leads={cols})")
            print(f"  Selected     : Lead index {PREFERRED_LEAD_INDEX} (column)")
            signal_1d = raw[:, PREFERRED_LEAD_INDEX].astype(float)
        else:
            # Shape: (leads × samples)
            print(f"  Layout       : Multi-lead — shape (leads={rows} × samples={cols})")
            print(f"  Selected     : Lead index {PREFERRED_LEAD_INDEX} (row)")
            signal_1d = raw[PREFERRED_LEAD_INDEX, :].astype(float)

        print(f"  Lead values  : min={signal_1d.min():.4f}, max={signal_1d.max():.4f}")
        return signal_1d

    else:
        raise ValueError(f"Unexpected array dimensions: {raw.ndim}D. Expected 1D or 2D.")


# ─────────────────────────────────────────────
# STEP 1B: Clean the signal
# ─────────────────────────────────────────────
def clean_signal(signal_1d, sampling_rate=SAMPLING_RATE):
    """
    Apply NeuroKit2 ECG cleaning.
    This performs:
      - Baseline wander removal (high-pass filter ~0.5 Hz)
      - Powerline noise removal (notch filter at 50 or 60 Hz)
      - Smoothing
    Returns cleaned signal (same length as input).
    """
    cleaned = nk.ecg_clean(signal_1d, sampling_rate=sampling_rate, method="neurokit")
    return cleaned


# ─────────────────────────────────────────────
# STEP 1C: Plot raw vs. cleaned
# ─────────────────────────────────────────────
def plot_signals(signal_raw_1d, signal_cleaned, filename, sampling_rate=SAMPLING_RATE):
    """
    Plot the first 10 seconds of raw vs. cleaned ECG side by side.
    """
    max_samples = min(len(signal_raw_1d), sampling_rate * 10)  # 10 seconds max
    time_axis = np.arange(max_samples) / sampling_rate

    fig, axes = plt.subplots(2, 1, figsize=(14, 6), sharex=True)
    fig.suptitle(f"Step 1 — Signal Loading & Cleaning\n{os.path.basename(filename)}", fontsize=13)

    axes[0].plot(time_axis, signal_raw_1d[:max_samples], color="steelblue", linewidth=0.8)
    axes[0].set_title("Raw Signal")
    axes[0].set_ylabel("Amplitude")
    axes[0].grid(True, alpha=0.4)

    axes[1].plot(time_axis, signal_cleaned[:max_samples], color="darkorange", linewidth=0.8)
    axes[1].set_title("Cleaned Signal (NeuroKit2)")
    axes[1].set_ylabel("Amplitude")
    axes[1].set_xlabel("Time (seconds)")
    axes[1].grid(True, alpha=0.4)

    plt.tight_layout()

    out_name = os.path.splitext(os.path.basename(filename))[0] + "_step1.png"
    plt.savefig(out_name, dpi=120)
    plt.show()
    print(f"  📊 Plot saved: {out_name}")


# ─────────────────────────────────────────────
# MAIN — Run Step 1 on all files
# ─────────────────────────────────────────────
if __name__ == "__main__":

    results = {}

    for filepath in ECG_FILES:
        if not os.path.exists(filepath):
            print(f"\n❌ File not found: {filepath} — skipping.\n")
            continue

        # 1A — Load and inspect
        signal_1d, raw = load_and_inspect(filepath)

        # 1B — Clean
        print("\n  🧹 Cleaning signal...")
        cleaned = clean_signal(signal_1d)
        print(f"  Cleaned shape: {cleaned.shape}")
        print(f"  Cleaned range: {cleaned.min():.4f} to {cleaned.max():.4f}")

        # 1C — Plot
        plot_signals(signal_1d, cleaned, filepath)

        # Store for later steps
        results[filepath] = {
            "raw_1d": signal_1d,
            "cleaned": cleaned,
            "sampling_rate": SAMPLING_RATE,
        }

        print(f"\n  ✅ Step 1 COMPLETE for {os.path.basename(filepath)}\n")

    print("=" * 60)
    print("ALL FILES PROCESSED — Step 1 done.")
    print("=" * 60)
    print("""
NEXT STEPS FOR YOU:
  1. Check each plot: does the cleaned signal look like a normal ECG?
  2. Confirm the shape printed matches what you expect.
  3. If multi-lead: confirm PREFERRED_LEAD_INDEX = 1 (Lead II) is correct.
  4. Report back any warnings or strange amplitude values.
    """)