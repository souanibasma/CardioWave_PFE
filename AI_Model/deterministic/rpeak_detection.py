"""
ECG Pipeline — STEP 2 (Robust): R-Peak Detection
=================================================
Problem: Global polarity flip is too fragile for complex/mixed morphology.
Solution: Try multiple detection methods, pick the one whose beat count
          best matches expected HR range, with per-method validation.

Cardiologist ground truth HR (for validation):
  1→60, 2→60, 3→60, 4→60, 5→130, 6→60, 7→70, 8→55, 9→48, 10→60

Data: Shape (4,5000), Row 3 = full Lead II 10s @ 500Hz
"""

import numpy as np
import neurokit2 as nk
import matplotlib.pyplot as plt
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

# Cardiologist ground truth HR — used ONLY for validation comparison
# NOT used to guide detection (that would be cheating)
CARDIOLOGIST_HR = {
    "1.npy": 60, "2.npy": 60,  "3.npy": 60,  "4.npy": 60,  "5.npy": 130,
    "6.npy": 60, "7.npy": 70,  "8.npy": 55,  "9.npy": 48,  "10.npy": 60,
}

# Detection methods to try (in priority order)
METHODS = [
    "pantompkins1985",
    "hamilton2002",
    "elgendi2010",
    "engzeemod2012",
    "neurokit",
]


# ─────────────────────────────────────────────
# LOAD
# ─────────────────────────────────────────────
def load_ecg(filepath):
    raw = np.load(filepath)
    assert raw.shape == (4, 5000), f"Unexpected shape {raw.shape}"
    seg = SEGMENT_LEN
    segments = {
        "I"      : raw[0, 0*seg:1*seg].astype(float),
        "aVR"    : raw[0, 1*seg:2*seg].astype(float),
        "V1"     : raw[0, 2*seg:3*seg].astype(float),
        "V4"     : raw[0, 3*seg:4*seg].astype(float),
        "II"     : raw[1, 0*seg:1*seg].astype(float),
        "aVL"    : raw[1, 1*seg:2*seg].astype(float),
        "V2"     : raw[1, 2*seg:3*seg].astype(float),
        "V5"     : raw[1, 3*seg:4*seg].astype(float),
        "III"    : raw[2, 0*seg:1*seg].astype(float),
        "aVF"    : raw[2, 1*seg:2*seg].astype(float),
        "V3"     : raw[2, 2*seg:3*seg].astype(float),
        "V6"     : raw[2, 3*seg:4*seg].astype(float),
        "II_full": raw[3, :].astype(float),
    }
    return {"lead_II_continuous": raw[3, :].astype(float), "segments": segments, "raw": raw}


# ─────────────────────────────────────────────
# CLEAN
# ─────────────────────────────────────────────
def clean_signal(signal, sampling_rate=SAMPLING_RATE):
    return nk.ecg_clean(signal, sampling_rate=sampling_rate, method="neurokit")


# ─────────────────────────────────────────────
# SCORE a set of r_peaks for quality
# ─────────────────────────────────────────────
def score_peaks(r_peaks, signal_length, sampling_rate=SAMPLING_RATE):
    """
    Score a candidate set of R-peaks.
    Higher score = more physiologically plausible.

    Criteria:
    - RR intervals in physiological range (300–2000ms) → high score
    - Low coefficient of variation of RR → regular rhythm (good for sinus)
    - Penalize very few or very many peaks
    """
    if len(r_peaks) < 3:
        return -1000.0

    rr_ms = np.diff(r_peaks) / sampling_rate * 1000
    n_valid  = np.sum((rr_ms >= 300) & (rr_ms <= 2000))
    n_total  = len(rr_ms)
    pct_valid = n_valid / n_total if n_total > 0 else 0

    # RR regularity (lower CV = more regular = better for sinus detection)
    cv = rr_ms.std() / rr_ms.mean() if rr_ms.mean() > 0 else 99

    score = pct_valid * 100 - cv * 20
    return score


# ─────────────────────────────────────────────
# MULTI-METHOD DETECTION
# ─────────────────────────────────────────────
def detect_rpeaks_robust(cleaned_signal, sampling_rate=SAMPLING_RATE):
    """
    Try all methods on original + flipped signal.
    Return the set of peaks with the highest physiological plausibility score.

    Returns:
        best_peaks   : np.array of sample indices
        best_method  : method name string
        best_polarity: +1 or -1
        all_scores   : dict of (method, polarity) → score  (for debugging)
    """
    candidates = {}

    for method in METHODS:
        for polarity in [+1, -1]:
            detection_signal = cleaned_signal * polarity
            try:
                _, info = nk.ecg_peaks(
                    detection_signal,
                    sampling_rate=sampling_rate,
                    method=method,
                    correct_artifacts=True,
                )
                peaks = info["ECG_R_Peaks"]
                score = score_peaks(peaks, len(cleaned_signal), sampling_rate)
                candidates[(method, polarity)] = (peaks, score)
            except Exception as e:
                candidates[(method, polarity)] = (np.array([]), -9999.0)

    # Pick best
    best_key = max(candidates.keys(), key=lambda k: candidates[k][1])
    best_peaks, best_score = candidates[best_key]
    best_method, best_polarity = best_key

    all_scores = {k: v[1] for k, v in candidates.items()}

    return best_peaks, best_method, best_polarity, best_score, all_scores


# ─────────────────────────────────────────────
# VALIDATE + COMPARE TO CARDIOLOGIST
# ─────────────────────────────────────────────
def validate_and_compare(r_peaks, signal_length, filename, sampling_rate=SAMPLING_RATE):
    fname = os.path.basename(filename)
    n_beats = len(r_peaks)
    duration_sec = signal_length / sampling_rate

    results = {"n_beats": n_beats}
    results["beats_ok"] = (duration_sec * 35/60) <= n_beats <= (duration_sec * 220/60)

    if n_beats >= 2:
        rr_ms = np.diff(r_peaks) / sampling_rate * 1000
        results["rr_ms"]        = rr_ms
        results["rr_mean_ms"]   = rr_ms.mean()
        results["rr_min_ms"]    = rr_ms.min()
        results["rr_max_ms"]    = rr_ms.max()
        results["rr_std_ms"]    = rr_ms.std()
        results["hr_mean_bpm"]  = 60000 / rr_ms.mean()
        results["rr_too_short"] = int((rr_ms < 300).sum())
        results["rr_too_long"]  = int((rr_ms > 2000).sum())

        # Compare to cardiologist
        cardio_hr = CARDIOLOGIST_HR.get(fname)
        if cardio_hr:
            our_hr = results["hr_mean_bpm"]
            hr_error = abs(our_hr - cardio_hr)
            results["cardio_hr"]  = cardio_hr
            results["hr_error"]   = hr_error
            results["hr_match"]   = hr_error <= 15   # ±15 bpm tolerance
    else:
        results["rr_ms"] = np.array([])
        for k in ["rr_mean_ms","rr_min_ms","rr_max_ms","rr_std_ms","hr_mean_bpm"]:
            results[k] = None
        results["rr_too_short"] = results["rr_too_long"] = 0
        results["cardio_hr"] = results["hr_error"] = None
        results["hr_match"] = False

    return results


# ─────────────────────────────────────────────
# PLOT
# ─────────────────────────────────────────────
def plot_rpeaks(cleaned, r_peaks, polarity, method, filename, val, sampling_rate=SAMPLING_RATE):
    time_axis = np.arange(len(cleaned)) / sampling_rate
    polarity_str = "Normal" if polarity == 1 else "Inverted (flipped)"

    hr_str = ""
    if val.get("hr_mean_bpm"):
        our_hr = val["hr_mean_bpm"]
        cardio_hr = val.get("cardio_hr", "?")
        match = "✅" if val.get("hr_match") else "❌"
        hr_str = f"  |  HR={our_hr:.0f} bpm  (cardiologist: {cardio_hr} bpm) {match}"

    fig, ax = plt.subplots(figsize=(15, 4))
    ax.plot(time_axis, cleaned, color="darkorange", linewidth=0.9, label="Lead II (cleaned)")
    ax.scatter(
        r_peaks / sampling_rate,
        cleaned[r_peaks],
        color="red", s=70, zorder=5,
        label=f"R-peaks (n={len(r_peaks)}) | method={method} | polarity={polarity_str}"
    )
    ax.set_title(
        f"Step 2 — {os.path.basename(filename)}{hr_str}\n"
        f"Method: {method} | Polarity: {polarity_str}",
        fontsize=10
    )
    ax.set_xlabel("Time (seconds)")
    ax.set_ylabel("Amplitude")
    ax.legend(loc="upper right", fontsize=8)
    ax.grid(True, alpha=0.4)
    plt.tight_layout()

    out_name = os.path.splitext(os.path.basename(filename))[0] + "_step2.png"
    plt.savefig(out_name, dpi=120)
    plt.show()
    print(f"  📊 Plot saved: {out_name}")


# ─────────────────────────────────────────────
# PRINT REPORT
# ─────────────────────────────────────────────
def print_report(filename, val, best_method, best_polarity, best_score):
    print(f"\n  {'─'*60}")
    print(f"  FILE : {os.path.basename(filename)}")
    print(f"  {'─'*60}")
    print(f"  Best method      : {best_method} | polarity={'Normal(+1)' if best_polarity==1 else 'Inverted(-1)'}")
    print(f"  Plausibility score: {best_score:.1f}")
    print(f"  R-peaks detected : {val['n_beats']}")
    print(f"  Beat count OK?   : {'✅' if val['beats_ok'] else '❌ UNEXPECTED'}")

    if val.get("hr_mean_bpm"):
        hr = val["hr_mean_bpm"]
        rr = val["rr_mean_ms"]
        print(f"  RR mean          : {rr:.1f} ms")
        print(f"  HR (detected)    : {hr:.1f} bpm")
        print(f"  HR (cardiologist): {val.get('cardio_hr', '?')} bpm")
        hr_err = val.get("hr_error")
        match = val.get("hr_match")
        if hr_err is not None:
            print(f"  HR error         : {hr_err:.1f} bpm  {'✅ MATCH (≤15 bpm)' if match else '❌ MISMATCH (>15 bpm)'}")
        print(f"  RR std dev       : {val['rr_std_ms']:.1f} ms  "
              f"{'⚠️  High variability' if val['rr_std_ms'] > 150 else '✅ Low variability'}")
        if val["rr_too_short"] > 0:
            print(f"  ⚠️  {val['rr_too_short']} RR(s) < 300ms → possible double detection")
        if val["rr_too_long"] > 0:
            print(f"  ⚠️  {val['rr_too_long']} RR(s) > 2000ms → possible missed beat")

        if hr > 100:
            hint = "🔴 TACHYCARDIA"
        elif hr < 60:
            hint = "🔵 BRADYCARDIA"
        else:
            hint = "🟢 NORMAL RANGE"
        print(f"  Rhythm hint      : {hint}")


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
if __name__ == "__main__":

    all_results = {}
    summary_rows = []

    print("=" * 65)
    print("STEP 2 (Robust) — Multi-Method R-Peak Detection")
    print("=" * 65)

    for filepath in ECG_FILES:
        if not os.path.exists(filepath):
            print(f"\n❌ File not found: {filepath}")
            continue

        print(f"\n▶ Processing {filepath} ...")

        ecg_data = load_ecg(filepath)
        lead_II  = ecg_data["lead_II_continuous"]
        cleaned  = clean_signal(lead_II)

        # Multi-method robust detection
        r_peaks, best_method, best_polarity, best_score, all_scores = \
            detect_rpeaks_robust(cleaned)

        # Validate + compare to cardiologist
        val = validate_and_compare(r_peaks, len(cleaned), filepath)

        # Report
        print_report(filepath, val, best_method, best_polarity, best_score)

        # Plot
        plot_rpeaks(cleaned, r_peaks, best_polarity, best_method, filepath, val)

        # Store
        all_results[filepath] = {
            "ecg_data"    : ecg_data,
            "cleaned_II"  : cleaned,
            "r_peaks"     : r_peaks,
            "polarity"    : best_polarity,
            "method"      : best_method,
            "validation"  : val,
        }

        # Summary row
        hr_str = f"{val['hr_mean_bpm']:.0f}" if val.get("hr_mean_bpm") else "N/A"
        cardio  = val.get("cardio_hr", "?")
        match   = "✅" if val.get("hr_match") else "❌"
        summary_rows.append((os.path.basename(filepath), hr_str, cardio, match, best_method))

    # ── Final summary table ──
    print("\n" + "=" * 65)
    print("SUMMARY — HR vs Cardiologist")
    print("=" * 65)
    print(f"  {'File':<10} {'Our HR':>8} {'Cardio HR':>10} {'Match':>7}  Method")
    print(f"  {'─'*10} {'─'*8} {'─'*10} {'─'*7}  {'─'*20}")
    for row in summary_rows:
        fname, our_hr, cardio, match, method = row
        print(f"  {fname:<10} {our_hr:>8} {str(cardio):>10} {match:>7}  {method}")

    print("""
─────────────────────────────────────────────────────────────────
WHAT TO VERIFY IN EACH PLOT:

  ✅ One red dot per visible QRS complex
  ✅ Dot sits at the DOMINANT deflection (positive tip OR negative trough)
  ✅ No missed beats, no double detections
  ✅ HR printed in title matches cardiologist value (±15 bpm)

REPORT BACK:
  1. The summary table (which files ✅ / ❌ on HR match?)
  2. Which plots still show wrong dot placement?
  3. Your EXACT cardiologist reports — I can see them now and will use
     them directly for Step 3 onwards.
─────────────────────────────────────────────────────────────────
    """)