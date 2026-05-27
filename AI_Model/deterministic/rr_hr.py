"""
ECG Pipeline — STEP 3: RR Intervals + Heart Rate
=================================================
Goal:
  - Compute all RR intervals (ms) from validated R-peaks
  - Fix known issues: file 7 missed beats, file 8 boundary artifact
  - Calculate mean/min/max HR
  - Classify rhythm: Tachycardia / Normal / Bradycardia
  - Compare to cardiologist ground truth
  - Produce a clean feature table

Medical rules (from spec):
  - RR normal range: 600–1000 ms
  - HR = 60000 / RR_mean
  - Sinus Tachycardia: HR > 100 bpm
  - Sinus Bradycardia: HR < 60 bpm

Sampling rate: 500 Hz
"""

import numpy as np
import neurokit2 as nk
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import os

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────
ECG_FILES = [
    "data/1.npy", "data/2.npy", "data/3.npy", "data/4.npy", "data/5.npy",
    "data/6.npy", "data/7.npy", "data/8.npy", "data/9.npy", "data/10.npy",
]

SAMPLING_RATE = 500
SEGMENT_LEN   = 1250

# Cardiologist ground truth
CARDIOLOGIST = {
    "1.npy":  {"hr": 60,  "rhythm": "Normal",      "pr_ms": 120, "qrs": "fine"},
    "2.npy":  {"hr": 60,  "rhythm": "Irregular",   "pr_ms": None,"qrs": "fine"},
    "3.npy":  {"hr": 60,  "rhythm": "Normal",      "pr_ms": 160, "qrs": "fine"},
    "4.npy":  {"hr": 60,  "rhythm": "Normal",      "pr_ms": 120, "qrs": "fine"},
    "5.npy":  {"hr": 130, "rhythm": "Tachycardia", "pr_ms": 120, "qrs": "fine"},
    "6.npy":  {"hr": 60,  "rhythm": "Normal",      "pr_ms": 160, "qrs": "fine"},
    "7.npy":  {"hr": 70,  "rhythm": "Normal",      "pr_ms": 180, "qrs": "fine"},
    "8.npy":  {"hr": 55,  "rhythm": "Bradycardia", "pr_ms": 180, "qrs": "fine"},
    "9.npy":  {"hr": 48,  "rhythm": "Bradycardia", "pr_ms": 160, "qrs": "fine"},
    "10.npy": {"hr": 60,  "rhythm": "Normal",      "pr_ms": 200, "qrs": "wide_130ms"},
}

# Detection methods chosen in Step 2 (locked in)
STEP2_CONFIG = {
    "1.npy":  {"method": "neurokit",      "polarity": -1},
    "2.npy":  {"method": "neurokit",      "polarity": -1},
    "3.npy":  {"method": "engzeemod2012", "polarity": -1},
    "4.npy":  {"method": "neurokit",      "polarity": -1},
    "5.npy":  {"method": "engzeemod2012", "polarity": +1},
    "6.npy":  {"method": "neurokit",      "polarity": -1},
    "7.npy":  {"method": "engzeemod2012", "polarity": -1},
    "8.npy":  {"method": "neurokit",      "polarity": +1},
    "9.npy":  {"method": "neurokit",      "polarity": -1},
    "10.npy": {"method": "hamilton2002",  "polarity": +1},
}


# ─────────────────────────────────────────────
# LOAD + CLEAN (same as previous steps)
# ─────────────────────────────────────────────
def load_and_clean(filepath):
    raw = np.load(filepath)
    assert raw.shape == (4, 5000)
    lead_II = raw[3, :].astype(float)
    cleaned = nk.ecg_clean(lead_II, sampling_rate=SAMPLING_RATE, method="neurokit")
    return cleaned


# ─────────────────────────────────────────────
# R-PEAK DETECTION (locked Step 2 config)
# ─────────────────────────────────────────────
def detect_rpeaks(cleaned, filepath):
    fname = os.path.basename(filepath)
    cfg = STEP2_CONFIG[fname]
    method   = cfg["method"]
    polarity = cfg["polarity"]

    detection_signal = cleaned * polarity
    _, info = nk.ecg_peaks(
        detection_signal,
        sampling_rate=SAMPLING_RATE,
        method=method,
        correct_artifacts=True,
    )
    r_peaks = info["ECG_R_Peaks"]

    # ── Fix 1: Remove boundary artifact (last peak too close to signal end) ──
    min_distance_from_end = int(0.2 * SAMPLING_RATE)  # 200ms
    r_peaks = r_peaks[r_peaks < len(cleaned) - min_distance_from_end]

    # ── Fix 2: Remove peaks too close together (< 250ms = impossible HR > 240) ──
    if len(r_peaks) > 1:
        rr_samples = np.diff(r_peaks)
        min_rr_samples = int(0.25 * SAMPLING_RATE)  # 250ms
        keep = np.concatenate([[True], rr_samples >= min_rr_samples])
        r_peaks = r_peaks[keep]

    return r_peaks


# ─────────────────────────────────────────────
# STEP 3A: Compute RR intervals
# ─────────────────────────────────────────────
def compute_rr(r_peaks, sampling_rate=SAMPLING_RATE):
    """
    Compute RR intervals in milliseconds.
    Each RR[i] = time from peak[i] to peak[i+1].
    Returns array of length (n_peaks - 1).
    """
    if len(r_peaks) < 2:
        return np.array([])
    rr_samples = np.diff(r_peaks)
    rr_ms = rr_samples / sampling_rate * 1000
    return rr_ms


# ─────────────────────────────────────────────
# STEP 3B: Compute HR features
# ─────────────────────────────────────────────
def compute_hr_features(rr_ms):
    """
    From RR intervals, compute all HR-related features.

    Returns dict with:
      hr_mean    : mean HR (bpm) — primary classification metric
      hr_min     : HR at longest RR (slowest beat)
      hr_max     : HR at shortest RR (fastest beat)
      rr_mean    : mean RR (ms)
      rr_std     : std of RR (ms) — variability indicator
      rr_min     : shortest RR (ms)
      rr_max     : longest RR (ms)
      n_rr_normal: count of RR in normal range (600–1000ms)
      pct_normal : percent of RR in normal range
    """
    if len(rr_ms) == 0:
        return {}

    features = {
        "rr_mean_ms"  : float(rr_ms.mean()),
        "rr_std_ms"   : float(rr_ms.std()),
        "rr_min_ms"   : float(rr_ms.min()),
        "rr_max_ms"   : float(rr_ms.max()),
        "hr_mean_bpm" : float(60000 / rr_ms.mean()),
        "hr_min_bpm"  : float(60000 / rr_ms.max()),   # slowest HR = longest RR
        "hr_max_bpm"  : float(60000 / rr_ms.min()),   # fastest HR = shortest RR
        "n_beats"     : len(rr_ms) + 1,
        "n_rr_normal" : int(((rr_ms >= 600) & (rr_ms <= 1000)).sum()),
        "pct_normal"  : float(((rr_ms >= 600) & (rr_ms <= 1000)).mean() * 100),
    }
    return features


# ─────────────────────────────────────────────
# STEP 3C: Classify rhythm
# ─────────────────────────────────────────────
def classify_rhythm(features):
    """
    Classification robuste du rythme basée sur HR + variabilité RR
    """

    if not features:
        return "UNKNOWN", "gray", ""

    hr = features["hr_mean_bpm"]
    rr_std = features["rr_std_ms"]

    # ── PRIORITÉ 1 : fréquence ──
    if hr > 100:
        label = "Sinus Tachycardia"
        color = "red"

    elif hr < 55:
        label = "Sinus Bradycardia"
        color = "blue"

    # ── PRIORITÉ 2 : régularité ──
    else:
        if rr_std > 80:
            label = "Irregular Rhythm"
            color = "orange"
        else:
            label = "Normal Sinus Rhythm"
            color = "green"

    # ── Note optionnelle ──
    note = ""
    if rr_std > 150:
        note = " (high RR variability)"

    return label, color, note

# ─────────────────────────────────────────────
# PLOT: RR intervals over time + HR line
# ─────────────────────────────────────────────
def plot_rr_and_hr(r_peaks, rr_ms, features, rhythm_label, rhythm_color,
                   filename, sampling_rate=SAMPLING_RATE):
    """
    Two-panel plot:
      Top: RR intervals over time (bar chart) with normal range shaded
      Bottom: Instantaneous HR over time
    """
    if len(rr_ms) == 0:
        return

    # X-axis: time of the second R-peak in each pair (midpoint of RR)
    rr_times = r_peaks[1:] / sampling_rate

    inst_hr = 60000 / rr_ms

    cardio = CARDIOLOGIST.get(os.path.basename(filename), {})
    cardio_hr = cardio.get("hr", "?")

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 7), sharex=True)
    fig.suptitle(
        f"Step 3 — RR Intervals & Heart Rate | {os.path.basename(filename)}\n"
        f"HR={features['hr_mean_bpm']:.1f} bpm  |  Cardiologist: {cardio_hr} bpm  |  {rhythm_label}",
        fontsize=12
    )

    # ── Panel 1: RR intervals ──
    ax1.bar(rr_times, rr_ms, width=0.3, color="steelblue", alpha=0.7, label="RR interval (ms)")
    ax1.axhspan(600, 1000, alpha=0.1, color="green", label="Normal RR range (600–1000 ms)")
    ax1.axhline(features["rr_mean_ms"], color="navy", linestyle="--", linewidth=1.5,
                label=f"Mean RR = {features['rr_mean_ms']:.0f} ms")
    ax1.set_ylabel("RR Interval (ms)")
    ax1.set_ylim(0, max(rr_ms.max() * 1.2, 1100))
    ax1.legend(loc="upper right", fontsize=9)
    ax1.grid(True, alpha=0.3)

    # ── Panel 2: Instantaneous HR ──
    ax2.plot(rr_times, inst_hr, color=rhythm_color, linewidth=2, marker="o",
             markersize=5, label="Instantaneous HR (bpm)")
    ax2.axhline(features["hr_mean_bpm"], color="black", linestyle="--", linewidth=1.5,
                label=f"Mean HR = {features['hr_mean_bpm']:.1f} bpm")
    ax2.axhspan(60, 100, alpha=0.08, color="green", label="Normal HR range (60–100 bpm)")
    ax2.axhline(100, color="red",  linestyle=":", linewidth=1, alpha=0.7)
    ax2.axhline(60,  color="blue", linestyle=":", linewidth=1, alpha=0.7)
    ax2.set_ylabel("Heart Rate (bpm)")
    ax2.set_xlabel("Time (seconds)")
    ax2.set_xlim(0, 10)
    ax2.legend(loc="upper right", fontsize=9)
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    out_name = os.path.splitext(os.path.basename(filename))[0] + "_step3.png"
    plt.savefig(out_name, dpi=120)
    plt.show()
    print(f"  📊 Step 3 plot saved: {out_name}")


# ─────────────────────────────────────────────
# PRINT REPORT per file
# ─────────────────────────────────────────────
def print_report(filename, features, rr_ms, rhythm_label, rhythm_note):
    fname = os.path.basename(filename)
    cardio = CARDIOLOGIST.get(fname, {})
    cardio_hr = cardio.get("hr", "?")
    cardio_rhythm = cardio.get("rhythm", "?")

    hr_error = abs(features["hr_mean_bpm"] - cardio_hr) if isinstance(cardio_hr, (int, float)) else None
    hr_match = hr_error is not None and hr_error <= 10

    print(f"\n  {'─'*60}")
    print(f"  FILE : {fname}")
    print(f"  {'─'*60}")
    print(f"  Beats detected   : {features['n_beats']}")
    print(f"  RR mean          : {features['rr_mean_ms']:.1f} ms")
    print(f"  RR std           : {features['rr_std_ms']:.1f} ms")
    print(f"  RR min / max     : {features['rr_min_ms']:.1f} / {features['rr_max_ms']:.1f} ms")
    print(f"  RR in normal range: {features['n_rr_normal']}/{len(rr_ms)}  "
          f"({features['pct_normal']:.0f}%)")
    print(f"  HR mean          : {features['hr_mean_bpm']:.1f} bpm")
    print(f"  HR min / max     : {features['hr_min_bpm']:.1f} / {features['hr_max_bpm']:.1f} bpm")
    print(f"  Rhythm           : {rhythm_label}{rhythm_note}")
    print(f"  ── Cardiologist comparison ──")
    print(f"  Cardio HR        : {cardio_hr} bpm")
    print(f"  HR error         : {hr_error:.1f} bpm  {'✅ OK' if hr_match else '⚠️ Check'}"
          if hr_error is not None else "  HR error         : N/A")
    print(f"  Cardio rhythm    : {cardio_rhythm}")

    # Rhythm match check
    our_rhythm = rhythm_label.lower()
    cardio_r = cardio_rhythm.lower()
    if "tachy" in cardio_r and "tachy" in our_rhythm:
        print(f"  Rhythm match     : ✅ Both = Tachycardia")
    elif "brady" in cardio_r and "brady" in our_rhythm:
        print(f"  Rhythm match     : ✅ Both = Bradycardia")
    elif "normal" in cardio_r and "normal" in our_rhythm:
        print(f"  Rhythm match     : ✅ Both = Normal")
    elif "irregular" in cardio_r:
        print(f"  Rhythm match     : ⚠️  Cardiologist says Irregular — will classify in Step 7")
    else:
        print(f"  Rhythm match     : ❌ Ours={rhythm_label} | Cardio={cardio_rhythm}")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
if __name__ == "__main__":

    all_features = {}
    summary_rows = []

    print("=" * 65)
    print("STEP 3 — RR Intervals + Heart Rate")
    print("=" * 65)

    for filepath in ECG_FILES:
        if not os.path.exists(filepath):
            print(f"\n❌ File not found: {filepath}")
            continue

        print(f"\n▶ Processing {filepath} ...")

        # Load + clean + detect (locked Step 2 config)
        cleaned = load_and_clean(filepath)
        r_peaks = detect_rpeaks(cleaned, filepath)

        # Compute RR
        rr_ms = compute_rr(r_peaks)

        # Compute HR features
        features = compute_hr_features(rr_ms)

        # Classify rhythm
        rhythm_label, rhythm_color, rhythm_note = classify_rhythm(features)

        # Report
        print_report(filepath, features, rr_ms, rhythm_label, rhythm_note)

        # Plot
        plot_rr_and_hr(r_peaks, rr_ms, features, rhythm_label, rhythm_color,
                       filepath)

        # Store
        all_features[filepath] = {
            "cleaned"      : cleaned,
            "r_peaks"      : r_peaks,
            "rr_ms"        : rr_ms,
            "features"     : features,
            "rhythm_label" : rhythm_label,
            "rhythm_color" : rhythm_color,
        }

        cardio = CARDIOLOGIST.get(os.path.basename(filepath), {})
        hr_err = abs(features["hr_mean_bpm"] - cardio.get("hr", 0))
        summary_rows.append((
            os.path.basename(filepath),
            f"{features['hr_mean_bpm']:.1f}",
            str(cardio.get("hr", "?")),
            f"{hr_err:.1f}",
            rhythm_label,
            str(cardio.get("rhythm", "?")),
        ))

    # ── Summary table ──
    print("\n" + "=" * 80)
    print("STEP 3 SUMMARY — HR & Rhythm vs Cardiologist")
    print("=" * 80)
    print(f"  {'File':<10} {'Our HR':>8} {'Cardio':>8} {'Error':>7}  "
          f"{'Our Rhythm':<22} {'Cardio Rhythm'}")
    print(f"  {'─'*10} {'─'*8} {'─'*8} {'─'*7}  {'─'*22} {'─'*20}")
    for row in summary_rows:
        fname, our_hr, c_hr, err, our_r, c_r = row
        match = "✅" if float(err) <= 10 else "❌"
        print(f"  {fname:<10} {our_hr:>8} {c_hr:>8} {err:>6}{match}  {our_r:<22} {c_r}")

    print("""
─────────────────────────────────────────────────────────────────
STEP 3 COMPLETE

WHAT TO VERIFY IN EACH PLOT:
  Top panel (RR bars):
    ✅ Bar heights consistent with expected HR
    ✅ Normal range band (green) contains most bars for normal files
    ✅ File 5 bars should be short (~460ms) — tachycardia
    ✅ Files 8/9 bars should be tall (~1100–1250ms) — bradycardia

  Bottom panel (instantaneous HR):
    ✅ Line stays near mean HR dashed line for regular rhythms
    ✅ File 2 should show big swings (irregular + PVCs)
    ✅ File 5 should be flat near 130 bpm

REPORT BACK:
  1. The full summary table
  2. The plots for any files that look wrong
  3. Confirm: are you ready for Step 4 (ECG delineation: P, QRS, T)?
─────────────────────────────────────────────────────────────────
    """)