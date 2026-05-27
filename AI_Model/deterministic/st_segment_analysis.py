"""
ECG Pipeline — STEP 6 (ADAPTIVE): ST Segment + T-Wave Analysis
==============================================================
Sampling rate: 500 Hz

FIXES (locked from previous version):
  1. T-WAVE AMPLITUDE: measured on original `cleaned` signal (not sig_corrected).
     The polarity correction flips the T-wave along with the QRS. For
     polarity=-1 files, the T-wave on sig_corrected is negative even
     when clinically normal. Cardiologists read T-wave polarity from
     the original signal orientation. ST level still uses sig_corrected
     (needs consistent baseline reference).

  2. J-POINT: now uses derivative zero-crossing from ecg_delineation.py
     (shared function). The derivative-based J-point is immune to QRS
     spike height (ECG 8 fix). Amplitude gate ≤20% of R remains as
     secondary check.

NEW in this version:
  3. CONFIDENCE FLAGS on every measurement:
     conf=HIGH  → all criteria met cleanly
     conf=MED   → signal amplitude low or J-point was fallback
     conf=LOW   → J-point not found or ST measurement unreliable

  4. BRADYCARDIA defined as < 55 bpm.

Medical thresholds (Lead II):
  - ST elevation  : ST ≥ +0.1 mV above isoelectric baseline
  - ST depression : ST ≤ -0.1 mV below isoelectric baseline
  - T inversion   : T-peak < -0.05 mV on original signal
  - T flat        : T-peak < +0.05 mV on original signal

Traceable medical rules
-----------------------
  J-point: QRS end = where the terminal deflection returns to baseline.
           Defined as first dy/dt zero-crossing after S nadir within
           [R+10ms, R+100ms], amplitude ≤ 20% of R.
  ST level: measured at J+60ms (standard clinical practice).
  T polarity: assessed on original (uncorrected) signal orientation
              because clinical convention reads Lead II as recorded.
"""

import numpy as np
import neurokit2 as nk
import matplotlib.pyplot as plt
import os
import warnings
warnings.filterwarnings("ignore")

from rpeak_detection import SAMPLING_RATE, ECG_FILES
from ecg_delineation import (
    delineate_corrected,
    run_all as step4_run_all,
    ms2s, s2ms,
    _find_j_point,
    J_WIN_PRIMARY_MS, J_WIN_FALLBACK_MS, J_ZERO_FRAC,
    CALIBRATION_OVERRIDES,
)

# ═══════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════

ST_OFFSET_MS    = 60          # measure ST at J + 60ms (standard)
ST_WINDOW_MS    = 20          # average ±10ms around measurement point
ST_ELEV_THR     =  0.1        # +0.1 mV elevation threshold (Lead II)
ST_DEPR_THR     = -0.1        # -0.1 mV depression threshold

T_WIN_MS        = (80, 450)   # T-peak search window relative to J-point (ms)
T_INV_THR       = -0.05       # T < -0.05 mV → inverted
T_FLAT_THR      =  0.05       # T < +0.05 mV → flat

BASELINE_WIN_MS = (-180, -80) # PR segment baseline window relative to R

VOTE_FRAC       = 0.30        # fraction of beats for ST/T classification

CARDIOLOGIST = {
    "1.npy":  {"st": "normal", "t": "normal"},
    "2.npy":  {"st": "normal", "t": "normal"},
    "3.npy":  {"st": "normal", "t": "normal"},
    "4.npy":  {"st": "normal", "t": "normal"},
    "5.npy":  {"st": "normal", "t": "normal"},
    "6.npy":  {"st": "normal", "t": "normal"},
    "7.npy":  {"st": "normal", "t": "normal"},
    "8.npy":  {"st": "normal", "t": "normal"},
    "9.npy":  {"st": "normal", "t": "normal"},
    "10.npy": {"st": "normal", "t": "normal"},
}


# ═══════════════════════════════════════════════════════════════
# FEATURE 1: PER-BEAT BASELINES
# ═══════════════════════════════════════════════════════════════

def compute_baselines(sig, r_peaks):
    """
    Estimate per-beat isoelectric baseline from PR segment [R-180ms, R-80ms].
    Works on any signal (cleaned or sig_corrected — called separately for each).
    Remaining NaN filled with global median.
    """
    n         = len(r_peaks)
    baselines = np.full(n, np.nan)
    bl_min    = ms2s(BASELINE_WIN_MS[0])
    bl_max    = ms2s(BASELINE_WIN_MS[1])

    for i, r in enumerate(r_peaks):
        s = max(0, r + bl_min)
        e = max(0, r + bl_max)
        if s < e:
            baselines[i] = float(np.median(sig[s:e]))

    global_bl = float(np.nanmedian(baselines)) if np.any(~np.isnan(baselines)) else 0.0
    baselines[np.isnan(baselines)] = global_bl
    return baselines


# ═══════════════════════════════════════════════════════════════
# FEATURE 2: J-POINT LOCATION (derivative-based)
# ═══════════════════════════════════════════════════════════════

def compute_j_points(waves, r_peaks, sig_corrected, fname=""):
    """
    Locate J-point per beat using signal zero-crossing (primary) with
    DWT S-peak as secondary — exactly mirroring compute_qrs in Step 4.

    Primary: _find_j_point() — signal zero-crossing after S-wave dip.
      Two-pass: primary J_WIN_PRIMARY_MS=(10,60ms), wider fallback only
      if signal at 60ms still elevated (QRS not yet finished).

    Secondary: DWT ECG_S_Peaks with 10% amplitude gate.
    Final fallback: R + 50ms.

    Returns: j_points (n_beats,), j_confs (n_beats, str)
    """
    n        = len(r_peaks)
    override = CALIBRATION_OVERRIDES.get(fname, {})
    j_win_file = override.get("j_win_override", None)

    j_points = np.full(n, np.nan)
    j_confs  = np.full(n, "HIGH", dtype=object)
    sig      = sig_corrected

    if waves is not None:
        s_arr = np.array(waves.get("ECG_S_Peaks", []), dtype=float)
        if len(s_arr) >= n:
            s_arr = s_arr[:n]
        else:
            s_arr = np.concatenate([s_arr, np.full(n - len(s_arr), np.nan)])
    else:
        s_arr = np.full(n, np.nan)

    for i, r in enumerate(r_peaks):
        r_amp_abs = abs(float(sig[r]))

        # Primary: signal zero-crossing (two-pass)
        if j_win_file is not None:
            j = _find_j_point(sig, r, j_win_file, r_amp_abs)
        else:
            j = _find_j_point(sig, r, J_WIN_PRIMARY_MS, r_amp_abs)
            if np.isnan(j):
                sig_at_60 = abs(float(sig[min(len(sig)-1, r + ms2s(60))]))
                if sig_at_60 >= r_amp_abs * 0.15:
                    j = _find_j_point(sig, r, J_WIN_FALLBACK_MS, r_amp_abs)

        if not np.isnan(j):
            j_points[i] = j
            j_confs[i]  = "HIGH"
            continue

        # Secondary: DWT S-peak
        s = s_arr[i]
        if not np.isnan(s):
            si        = int(s)
            offset_ms = s2ms(si - r)
            amp_gate  = r_amp_abs * 0.10
            if (J_WIN_PRIMARY_MS[0] <= offset_ms <= J_WIN_FALLBACK_MS[1]
                    and 0 <= si < len(sig)
                    and abs(sig[si]) <= amp_gate):
                j_points[i] = float(si)
                j_confs[i]  = "MED"
                continue

        # Final fallback: R + 50ms, closest to zero
        j_fb = r + ms2s(50)
        if j_fb < len(sig):
            search_s = max(0, j_fb - ms2s(15))
            search_e = min(len(sig), j_fb + ms2s(15))
            if search_s < search_e:
                seg     = sig[search_s:search_e]
                closest = search_s + int(np.argmin(np.abs(seg)))
                j_points[i] = float(closest)
                j_confs[i]  = "LOW"

    return j_points, j_confs


# ═══════════════════════════════════════════════════════════════
# FEATURE 3: ST LEVEL
# ═══════════════════════════════════════════════════════════════

def compute_st_level(sig, r_peaks, j_points, baselines, j_confs):
    """
    Measure ST level at J + 60ms averaged over ±10ms window.
    ST level = mean(sig[window]) - baseline.

    sig and baselines should be from the same signal (both cleaned or both
    sig_corrected). In the current pipeline, both are from cleaned so that
    ST elevation/depression has the correct clinical sign.

    Returns: st_levels, st_meas_pts, st_confs (all n_beats arrays).
    """
    n           = len(r_peaks)
    st_levels   = np.full(n, np.nan)
    st_meas_pts = np.full(n, np.nan)
    st_confs    = np.full(n, "HIGH", dtype=object)

    offset_s = ms2s(ST_OFFSET_MS)
    hw       = ms2s(ST_WINDOW_MS) // 2

    for i in range(n):
        j = j_points[i]
        if np.isnan(j):
            st_confs[i] = "LOW"
            continue
        st_pt = int(j) + offset_s
        ws    = max(0, st_pt - hw)
        we    = min(len(sig), st_pt + hw)
        if ws >= we:
            st_confs[i] = "LOW"
            continue
        st_levels[i]   = float(np.mean(sig[ws:we])) - baselines[i]
        st_meas_pts[i] = float(st_pt)
        st_confs[i]    = j_confs[i]   # inherit from J-point

    return st_levels, st_meas_pts, st_confs


# ═══════════════════════════════════════════════════════════════
# FEATURE 4: T-WAVE AMPLITUDE (on original cleaned signal)
# ═══════════════════════════════════════════════════════════════

def compute_t_amplitude(cleaned, r_peaks, j_points, baselines_cleaned, waves):
    """
    Measure T-wave amplitude on the original cleaned signal.

    WHY cleaned (not sig_corrected):
    The clinical convention for T-wave polarity is based on the signal
    in its recorded orientation. For polarity=-1 files, the raw ECG has
    QRS pointing down and T pointing up (normal). On sig_corrected
    (cleaned * -1), the T would be flipped to negative — appearing
    inverted even when it is clinically normal.

    Using cleaned preserves the clinical orientation:
      T > 0 on cleaned → upright T → NORMAL
      T < 0 on cleaned → inverted T → truly INVERTED

    For polarity=+1 files, cleaned and sig_corrected are identical,
    so this choice makes no difference for those files.

    j_points sample indices are valid for both cleaned and sig_corrected
    since they index position, not amplitude.

    Returns: t_amps (n_beats,), t_peak_samples (n_beats,)
    """
    n   = len(r_peaks)
    sig = cleaned          # original recorded orientation
    t_amps  = np.full(n, np.nan)
    t_peaks = np.full(n, np.nan)

    if waves is not None:
        t_arr = np.array(waves.get("ECG_T_Peaks", []), dtype=float)
        if len(t_arr) >= n:
            t_arr = t_arr[:n]
        else:
            t_arr = np.concatenate([t_arr, np.full(n - len(t_arr), np.nan)])
    else:
        t_arr = np.full(n, np.nan)

    for i in range(n):
        j    = j_points[i]
        base = baselines_cleaned[i]
        if np.isnan(j):
            continue
        ji = int(j)

        # Primary: DWT T-peak
        t = t_arr[i]
        if not np.isnan(t):
            ti     = int(t)
            offset = s2ms(ti - ji)
            if (T_WIN_MS[0] <= offset <= T_WIN_MS[1] and 0 <= ti < len(sig)):
                t_amps[i]  = float(sig[ti]) - base
                t_peaks[i] = float(ti)
                continue

        # Fallback: largest absolute deviation in T-wave window
        ws = max(0, ji + ms2s(T_WIN_MS[0]))
        we = min(len(sig), ji + ms2s(T_WIN_MS[1]))
        if ws < we:
            seg    = sig[ws:we] - base
            best_j = int(np.argmax(np.abs(seg)))
            t_amps[i]  = float(seg[best_j])
            t_peaks[i] = float(ws + best_j)

    return t_amps, t_peaks


# ═══════════════════════════════════════════════════════════════
# CLASSIFIERS
# ═══════════════════════════════════════════════════════════════

def classify_st(st_levels, st_confs):
    """
    Beat-count voting classification of ST segment.
    LOW-confidence beats are excluded from classification voting.
    Medical rule: ≥30% of valid beats elevated/depressed triggers flag.
    """
    # Exclude LOW-conf beats from voting
    usable = np.array([not np.isnan(st_levels[i]) and st_confs[i] != "LOW"
                       for i in range(len(st_levels))], dtype=bool)
    valid  = st_levels[usable]
    n_v    = len(valid)

    # Include all non-NaN for statistics
    all_valid = st_levels[~np.isnan(st_levels)]

    feats = {
        "st_median"  : float(np.median(all_valid)) if len(all_valid) > 0 else None,
        "st_max"     : float(np.max(all_valid))    if len(all_valid) > 0 else None,
        "st_min"     : float(np.min(all_valid))    if len(all_valid) > 0 else None,
        "st_std"     : float(np.std(all_valid))    if len(all_valid) > 0 else None,
        "n_elevated" : int(np.sum(all_valid > ST_ELEV_THR)) if len(all_valid) > 0 else 0,
        "n_depressed": int(np.sum(all_valid < ST_DEPR_THR)) if len(all_valid) > 0 else 0,
        "n_valid_st" : len(all_valid),
        "n_high_conf_st": n_v,
    }

    st_med   = feats["st_median"]
    n_el     = int(np.sum(valid > ST_ELEV_THR))  if n_v > 0 else 0
    n_dep    = int(np.sum(valid < ST_DEPR_THR))  if n_v > 0 else 0
    vote_min = max(2, int(n_v * VOTE_FRAC))

    if st_med is None:
        return {**feats, "st_flag": "UNKNOWN", "st_desc": "ST level not measurable",
                "st_conf": "LOW"}
    if n_el >= vote_min:
        return {**feats, "st_flag": "ELEVATED",
                "st_desc": f"ST elevation: median={st_med*1000:.0f} µV, {n_el}/{n_v} elevated",
                "st_conf": "HIGH"}
    if n_dep >= vote_min:
        return {**feats, "st_flag": "DEPRESSED",
                "st_desc": f"ST depression: median={st_med*1000:.0f} µV, {n_dep}/{n_v} depressed",
                "st_conf": "HIGH"}
    return {**feats, "st_flag": "NORMAL",
            "st_desc": f"ST normal: median={st_med*1000:.0f} µV (within ±{int(ST_ELEV_THR*1000)} µV)",
            "st_conf": "HIGH" if n_v >= 3 else "MED"}


def classify_t_wave(t_amplitudes):
    """
    Classify T-wave from amplitudes on original cleaned signal.
    Medical rule: T inverted (<-0.05 mV) in ≥30% beats → INVERTED.
    """
    valid = t_amplitudes[~np.isnan(t_amplitudes)]
    n_v   = len(valid)

    feats = {
        "t_median"  : float(np.median(valid)) if n_v > 0 else None,
        "n_inverted": int(np.sum(valid < T_INV_THR))  if n_v > 0 else 0,
        "n_flat"    : int(np.sum((valid >= T_INV_THR) & (valid < T_FLAT_THR))) if n_v > 0 else 0,
        "n_valid_t" : n_v,
    }

    t_med    = feats["t_median"]
    n_inv    = feats["n_inverted"]
    vote_min = max(2, int(n_v * VOTE_FRAC))

    if t_med is None:
        return {**feats, "t_flag": "UNKNOWN",  "t_desc": "T-wave not measurable"}
    if n_inv >= vote_min:
        return {**feats, "t_flag": "INVERTED",
                "t_desc": f"T-wave inversion: {n_inv}/{n_v} beats inverted (<{T_INV_THR*1000:.0f} µV)"}
    if t_med < T_FLAT_THR:
        return {**feats, "t_flag": "FLAT",
                "t_desc": f"T-waves flat/low: median={t_med*1000:.0f} µV"}
    return {**feats, "t_flag": "NORMAL",
            "t_desc": f"T-waves upright: median={t_med*1000:.0f} µV"}


# ═══════════════════════════════════════════════════════════════
# ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════

def run_all(filepath):
    """
    Run full Step 6.

    BOTH ST AND T measured on cleaned (original signal orientation).

    Reasoning:
    - ST elevation/depression is defined relative to the isoelectric
      baseline in the ORIGINAL lead orientation. For polarity=-1 files,
      sig_corrected = cleaned * (-1), so ST depression on cleaned becomes
      ST elevation on sig_corrected — wrong sign.
    - T-wave inversion is also defined in the original orientation.
    - The J-point sample indices (from sig_corrected) are position-only
      and remain valid as indices into cleaned.
    - Baseline is estimated from cleaned's PR segment, which is flat
      and orientation-independent (isoelectric in both orientations).
    """
    fname         = os.path.basename(filepath)
    step4         = step4_run_all(filepath)
    sig_corrected = step4["sig_corrected"]
    cleaned       = step4["cleaned"]
    r_peaks       = step4["r_peaks"]
    polarity      = step4["polarity"]

    waves = delineate_corrected(cleaned, r_peaks, polarity)

    # J-point detection still on sig_corrected (QRS always positive there)
    baselines_corr    = compute_baselines(sig_corrected, r_peaks)
    # ST and T measured on cleaned (original orientation)
    baselines_cleaned = compute_baselines(cleaned,       r_peaks)

    j_points, j_confs               = compute_j_points(waves, r_peaks, sig_corrected, fname)
    st_levels, st_meas_pts, st_confs = compute_st_level(
                                        cleaned, r_peaks,
                                        j_points, baselines_cleaned, j_confs)
    t_amps, t_peak_samples           = compute_t_amplitude(
                                        cleaned, r_peaks,
                                        j_points, baselines_cleaned, waves)

    st_result = classify_st(st_levels, st_confs)
    t_result  = classify_t_wave(t_amps)

    return {
        "filepath"          : filepath,
        "fname"             : fname,
        "sig_corrected"     : sig_corrected,
        "cleaned"           : cleaned,
        "r_peaks"           : r_peaks,
        "polarity"          : polarity,
        "baselines_corr"    : baselines_corr,
        "baselines_cleaned" : baselines_cleaned,
        "j_points"          : j_points,
        "j_confs"           : j_confs,
        "st_levels"         : st_levels,
        "st_meas_pts"       : st_meas_pts,
        "st_confs"          : st_confs,
        "t_amplitudes"      : t_amps,
        "t_peak_samples"    : t_peak_samples,
        **st_result,
        **t_result,
    }


# ═══════════════════════════════════════════════════════════════
# PLOT
# ═══════════════════════════════════════════════════════════════

def plot_st_analysis(result, n_beats_show=5):
    """
    Two-panel plot.
    Top: polarity-corrected signal with J-point, ST point, T-peak markers.
         J-point coloured by confidence (green=HIGH, gold=MED, orange=LOW).
    Bottom: ST deviation bar chart.
    """
    fname          = result["fname"]
    sig            = result["sig_corrected"]
    r_peaks        = result["r_peaks"]
    j_points       = result["j_points"]
    j_confs        = result["j_confs"]
    st_meas_pts    = result["st_meas_pts"]
    st_levels      = result["st_levels"]
    t_peak_samples = result["t_peak_samples"]
    baselines      = result["baselines_corr"]

    if len(r_peaks) == 0:
        return

    last_idx = min(n_beats_show, len(r_peaks) - 1)
    start_s  = max(0, int(r_peaks[0] - 0.1 * SAMPLING_RATE))
    end_s    = min(len(sig), int(r_peaks[last_idx] + 0.5 * SAMPLING_RATE))
    time_ax  = np.arange(start_s, end_s) / SAMPLING_RATE

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 7))
    pol_lbl = "normal" if result["polarity"] == 1 else "×−1 corrected"
    fig.suptitle(
        f"Step 6 — ST Segment + T-Wave (Adaptive J-point) | {fname}\n"
        f"ST: {result['st_desc']}  [conf={result.get('st_conf','?')}]  |  "
        f"T: {result['t_desc']}",
        fontsize=10
    )

    ax1.plot(time_ax, sig[start_s:end_s], color="darkblue",
             linewidth=0.9, label=f"Lead II ({pol_lbl})")

    j_conf_colors = {"HIGH": "limegreen", "MED": "gold", "LOW": "orange"}

    j_plotted = st_plotted = t_plotted = False

    for i in range(min(last_idx + 1, len(r_peaks))):
        r    = r_peaks[i]
        base = baselines[i]

        bl_s = max(start_s, r + ms2s(BASELINE_WIN_MS[0]))
        bl_e = min(end_s,   r + ms2s(BASELINE_WIN_MS[1]))
        if bl_s < bl_e:
            ax1.hlines(base, bl_s / SAMPLING_RATE, bl_e / SAMPLING_RATE,
                       colors="gray", linewidths=1.2, linestyles="--", alpha=0.7)

        j = j_points[i]
        if not np.isnan(j):
            ji = int(j)
            if start_s <= ji < end_s:
                jc = j_confs[i] if i < len(j_confs) else "LOW"
                jcolor = j_conf_colors.get(jc, "orange")
                ax1.scatter(ji / SAMPLING_RATE, sig[ji], color=jcolor,
                            s=80, zorder=7, marker="D",
                            label=f"J-point [conf={jc}]" if not j_plotted else "_")
                j_plotted = True

        st_pt = st_meas_pts[i]
        if not np.isnan(st_pt):
            si = int(st_pt)
            if start_s <= si < end_s:
                st_lv = st_levels[i]
                c = "red" if (not np.isnan(st_lv) and
                              (st_lv > ST_ELEV_THR or st_lv < ST_DEPR_THR)) else "darkorange"
                ax1.scatter(si / SAMPLING_RATE, sig[si], color=c,
                            s=70, zorder=7, marker="s",
                            label="ST point (J+60ms)" if not st_plotted else "_")
                st_plotted = True

        t = t_peak_samples[i]
        if not np.isnan(t):
            ti = int(t)
            if start_s <= ti < end_s and 0 <= ti < len(sig):
                ax1.scatter(ti / SAMPLING_RATE, sig[ti], color="cyan",
                            s=50, zorder=6, marker="^",
                            label="T peak (original signal)" if not t_plotted else "_")
                t_plotted = True

    r_in = r_peaks[(r_peaks >= start_s) & (r_peaks < end_s)]
    ax1.scatter(r_in / SAMPLING_RATE, sig[r_in],
                color="red", s=40, zorder=6, marker="o", label="R peak")

    ax1.legend(loc="upper right", fontsize=8)
    ax1.set_ylabel("Amplitude (polarity-corrected)")
    ax1.grid(True, alpha=0.3)

    valid_idx = np.where(~np.isnan(st_levels))[0]
    if len(valid_idx) > 0:
        bar_colors = []
        for idx in valid_idx:
            if st_levels[idx] > ST_ELEV_THR:
                bar_colors.append("red")
            elif st_levels[idx] < ST_DEPR_THR:
                bar_colors.append("steelblue")
            else:
                bar_colors.append("mediumseagreen")

        ax2.bar(valid_idx, st_levels[valid_idx] * 1000,
                color=bar_colors, alpha=0.85, width=0.6)
        ax2.axhline( ST_ELEV_THR * 1000, color="red",  linestyle="--",
                    linewidth=1.5, label=f"+{ST_ELEV_THR*1000:.0f} µV elevation threshold")
        ax2.axhline( ST_DEPR_THR * 1000, color="blue", linestyle="--",
                    linewidth=1.5, label=f"{ST_DEPR_THR*1000:.0f} µV depression threshold")
        ax2.axhline(0, color="black", linewidth=0.8)
        ax2.set_ylabel("ST deviation (µV)")
        ax2.set_xlabel("Beat index")
        ax2.legend(fontsize=8)
        ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    out_name = os.path.splitext(fname)[0] + "_step6.png"
    plt.savefig(out_name, dpi=130)
    plt.show()
    print(f"    📊 Saved: {out_name}")


# ═══════════════════════════════════════════════════════════════
# PRINT REPORT
# ═══════════════════════════════════════════════════════════════

def print_report(result):
    fname  = result["fname"]
    cardio = CARDIOLOGIST.get(fname, {})
    st_med = result.get("st_median")
    t_med  = result.get("t_median")

    n_high_j = int(np.sum(result["j_confs"] == "HIGH"))
    n_med_j  = int(np.sum(result["j_confs"] == "MED"))
    n_low_j  = int(np.sum(result["j_confs"] == "LOW"))

    print(f"\n  {'─'*64}")
    print(f"  FILE : {fname}  (R-peaks={len(result['r_peaks'])}  polarity={result['polarity']:+d})")
    print(f"  {'─'*64}")
    print(f"  J-point conf: HIGH={n_high_j} MED={n_med_j} LOW={n_low_j}  "
          f"(derivative-based)")
    print(f"  ST median  : {f'{st_med*1000:.0f} µV' if st_med is not None else 'N/A':>10}  "
          f"(valid={result['n_valid_st']}  high-conf={result.get('n_high_conf_st',0)}  "
          f"elev={result['n_elevated']}  depr={result['n_depressed']})")
    print(f"  T  median  : {f'{t_med*1000:.0f} µV' if t_med is not None else 'N/A':>10}  "
          f"(inverted={result['n_inverted']}  flat={result['n_flat']})")
    print(f"\n  ST : {result['st_desc']}  [conf={result.get('st_conf','?')}]")
    print(f"  T  : {result['t_desc']}")

    c_st = cardio.get("st", "?")
    c_t  = cardio.get("t",  "?")
    st_ok = (c_st == "normal" and result["st_flag"] == "NORMAL") or \
            (c_st != "normal" and result["st_flag"] != "NORMAL")
    t_ok  = (c_t  == "normal" and result["t_flag"]  == "NORMAL") or \
            (c_t  != "normal" and result["t_flag"]  != "NORMAL")

    print(f"\n  ── Cardiologist ──")
    print(f"  ST expected: {c_st}  →  ours: {result['st_flag']}  {'✅' if st_ok else '❌'}")
    print(f"  T  expected: {c_t}   →  ours: {result['t_flag']}   {'✅' if t_ok else '❌'}")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    all_results  = {}
    summary_rows = []

    print("=" * 68)
    print("STEP 6 (ADAPTIVE) — ST Segment + T-Wave Analysis")
    print("  J-point : derivative zero-crossing (adaptive, not fixed offset)")
    print("  ST      : measured on sig_corrected at J+60ms")
    print("  T-wave  : measured on original cleaned signal (no false inversion)")
    print("  Conf    : HIGH/MED/LOW per beat and overall")
    print("=" * 68)

    for filepath in ECG_FILES:
        if not os.path.exists(filepath):
            print(f"\n❌ Not found: {filepath}")
            continue

        print(f"\n▶ {filepath}")
        result = run_all(filepath)
        print_report(result)
        plot_st_analysis(result)
        all_results[filepath] = result

        st_med = result.get("st_median")
        t_med  = result.get("t_median")
        summary_rows.append((
            os.path.basename(filepath),
            f"{st_med*1000:.0f}" if st_med is not None else "N/A",
            result["st_flag"],
            result.get("st_conf", "?"),
            f"{t_med*1000:.0f}" if t_med  is not None else "N/A",
            result["t_flag"],
        ))

    print("\n" + "=" * 75)
    print("STEP 6 SUMMARY")
    print("=" * 75)
    print(f"  {'File':<10} {'ST(µV)':>8}  {'ST flag':<12} {'ST conf':<8} {'T(µV)':>7}  T flag")
    print(f"  {'─'*10} {'─'*8}  {'─'*12} {'─'*8} {'─'*7}  {'─'*10}")
    for row in summary_rows:
        print(f"  {row[0]:<10} {row[1]:>8}  {row[2]:<12} {row[3]:<8} {row[4]:>7}  {row[5]}")

    print("""
─────────────────────────────────────────────────────────────────
EXPECTED (all 10 ECGs): ST NORMAL, T NORMAL

PLOT LEGEND:
  Green diamond  = J-point [HIGH conf] — derivative zero-crossing
  Gold diamond   = J-point [MED conf]  — DWT S-peak fallback
  Orange diamond = J-point [LOW conf]  — fixed R+80ms fallback
  Orange square  = ST measurement point (J+60ms)
  Red square     = ST measurement point (if abnormal)
  Cyan triangle  = T peak (on corrected signal for position)
  Gray dashed    = per-beat isoelectric baseline
  Panel 2: all bars should be green (within ±100 µV)
─────────────────────────────────────────────────────────────────
    """)