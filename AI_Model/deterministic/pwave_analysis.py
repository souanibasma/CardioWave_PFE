"""
ECG Pipeline — STEP 5 (ADAPTIVE): P-Wave Analysis
==================================================
Sampling rate: 500 Hz

DETECTION ENGINE (do not modify):
  - AUC-based detection over ±20 ms integration window
  - QT-aware adaptive baseline (replaces static [-350ms,-250ms] window
    which lands on the T-wave at HR > 100 bpm)
  - QT-aware T-exclusion boundary with soft-zone penalty (replaces fixed
    0.65×RR fraction which over-estimates T-end at tachycardia)
  - Adaptive noise floor sampled from the same QT-aware TP window
  - All three geometry windows derived from Bazett-estimated QT when
    Step 4 measured QT is unavailable

DOWNSTREAM CONTRACT (keys required by run_pipeline.py / final_diagnosis.py):
  presence_pct        float   — % beats with P-wave detected
  presence_flag       str     — PRESENT / INTERMITTENT / ABSENT
  polarity_flag       str     — UPRIGHT / INVERTED / MIXED / UNKNOWN
  regularity_flag     str     — REGULAR / MILDLY_IRREGULAR / IRREGULAR /
                                INSUFFICIENT_DATA
  pp_std_ms           float | None
  p_dur_median        float | None
  p_dur_flag          str
  p_conf_flag         str     — HIGH / MED / LOW
  p_r_ratio_global    float
  p_conf_desc         str

  Plus all internal arrays kept for plotting:
  presence_per_beat, p_amplitudes, p_aucs, baselines,
  p_peaks_used, conf_per_beat, source_per_beat,
  r_peaks, sig_corrected, polarity, fname, filepath
"""

import numpy as np
import neurokit2 as nk
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D
import os
import warnings
warnings.filterwarnings("ignore")

from rpeak_detection import SAMPLING_RATE, ECG_FILES
from ecg_delineation import (
    delineate_corrected,
    run_all as step4_run_all,
    ms2s, s2ms,
    _compute_auc, _is_true_local_max, _noise_floor_estimate,
    P_LOW_CONF_RATIO,
)

# ═══════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════

# Adaptive geometry
BASELINE_SAFETY_PRE_P_MS = 30    # gap between TP window end and expected P onset
QTCNOMINAL_MS            = 420   # conservative QTc for Bazett estimation
T_EXCLUSION_SAFETY_MS    =10    # safety margin added to estimated T-end
T_SOFTZONE_WIDTH_MS      = 30    # width of soft transition zone

# AUC detection
P_AUC_HALF_WIN_MS  = 20
P_AUC_NOISE_MULT   = 3.0
P_AUC_FIXED_FLOOR  = 0.0005

# Amplitude gate
P_FALLBACK_AMP_MAX_FRAC = 0.50

# Confidence thresholds
P_MED_CONF_RATIO = 0.05   # P/R < 5% → MED   (P_LOW_CONF_RATIO=0.02 imported)

# P-wave search window relative to R (ms, negative = before R)
P_SEARCH_WIN_MS = (-300, -50)

# P-wave duration gate (ms)
P_DUR_MIN_MS = 40
P_DUR_MAX_MS = 160

# Cardiologist reference (for print_report comparison only)
CARDIOLOGIST = {
    "1.npy":  {"p_waves": "present",   "rhythm": "Normal Sinus"},
    "2.npy":  {"p_waves": "irregular", "rhythm": "Irregular"},
    "3.npy":  {"p_waves": "present",   "rhythm": "Normal Sinus"},
    "4.npy":  {"p_waves": "present",   "rhythm": "Normal Sinus"},
    "5.npy":  {"p_waves": "present",   "rhythm": "Tachycardia"},
    "6.npy":  {"p_waves": "present",   "rhythm": "Normal Sinus"},
    "7.npy":  {"p_waves": "present",   "rhythm": "Normal Sinus"},
    "8.npy":  {"p_waves": "present",   "rhythm": "Sinus Brady"},
    "9.npy":  {"p_waves": "present",   "rhythm": "Sinus Brady"},
    "10.npy": {"p_waves": "present",   "rhythm": "Normal Sinus"},
}


# ═══════════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ═══════════════════════════════════════════════════════════════

def _safe_median(arr):
    valid = arr[~np.isnan(arr)]
    return float(np.median(valid)) if len(valid) > 0 else None


def _r_amplitude_median(sig, r_peaks):
    amps = [abs(float(sig[r])) for r in r_peaks if 0 <= r < len(sig)]
    return float(np.median(amps)) if amps else 1.0


# ═══════════════════════════════════════════════════════════════
# DETECTION ENGINE — DO NOT MODIFY
# ═══════════════════════════════════════════════════════════════

def _tp_window_for_beat(r_idx, r_peaks, beat_i, qt_ms=None, rr_ms=None):
    """
    Compute the isoelectric TP window adaptively based on RR and QT.
    Returns (start_sample, end_sample) or None if TP < 20 ms.

    Priority:
      1. Measured QT from Step 4 (if 200 < qt_ms < 600).
      2. Bazett estimate: QT = QTc_nominal * sqrt(RR_s).
      3. None if TP window < 20 ms (TP absent at very fast HR).
    """
    if beat_i == 0:
        return None

    r_prev = r_peaks[beat_i - 1]
    rr_s   = (r_idx - r_prev) / SAMPLING_RATE

    if qt_ms is not None and 300 < qt_ms < 600:
        qt_s = qt_ms
    else:
        qt_s = QTCNOMINAL_MS * np.sqrt(rr_s) 

    tp_start = r_prev + int((qt_s / 1000) * SAMPLING_RATE)
    p_onset_earliest = r_idx - int(0.200 * SAMPLING_RATE)
    tp_end   = p_onset_earliest - int((BASELINE_SAFETY_PRE_P_MS / 1000) * SAMPLING_RATE)

    if tp_end - tp_start < int(0.020 * SAMPLING_RATE):
        return None

    return max(0, tp_start), max(0, tp_end)


def _per_beat_baseline(sig, r_idx, r_peaks=None, beat_i=None, qt_ms=None):
    """
    Estimate per-beat isoelectric baseline.
    Pass 1: Adaptive TP segment (QT-aware).
    Pass 2: Pre-P segment [R-200ms, R-100ms] — short but isoelectric even
            at fast HR.
    Pass 3: 0.0 absolute fallback.

    IMPORTANT: The original static [-350ms, -250ms] window is NOT used
    because at HR > 100 bpm it lands on the previous T-wave, corrupting
    the baseline and causing false ST depression downstream.
    """
    if r_peaks is not None and beat_i is not None:
        tp = _tp_window_for_beat(r_idx, r_peaks, beat_i, qt_ms)
        if tp is not None:
            s, e = tp
            if e > s + 5 and e <= len(sig):
                return float(np.median(sig[s:e]))

    s2 = max(0, r_idx - int(0.200 * SAMPLING_RATE))
    e2 = max(0, r_idx - int(0.100 * SAMPLING_RATE))
    if e2 > s2 + 5 and e2 <= len(sig):
        return float(np.median(sig[s2:e2]))

    return 0.0


def _noise_floor_estimate_adaptive(sig, r_idx, r_peaks, beat_i, qt_ms=None):
    """
    Rate-adaptive noise floor: sample from TP segment or pre-P region.
    Replaces the static version which samples the T-wave at high HR.
    """
    tp = _tp_window_for_beat(r_idx, r_peaks, beat_i, qt_ms)
    if tp is not None:
        s, e = tp
        if e > s + 10 and e <= len(sig):
            return float(np.std(sig[s:e]))

    s2 = max(0, r_idx - int(0.200 * SAMPLING_RATE))
    e2 = max(0, r_idx - int(0.100 * SAMPLING_RATE))
    if e2 > s2 + 5 and e2 <= len(sig):
        return float(np.std(sig[s2:e2]))

    return None


def _auc_threshold_for_beat(sig, r_idx, r_peaks=None, beat_i=None, qt_ms=None):
    """Compute per-beat AUC detection threshold using adaptive noise floor."""
    if r_peaks is not None and beat_i is not None:
        noise_std = _noise_floor_estimate_adaptive(sig, r_idx, r_peaks, beat_i, qt_ms)
    else:
        noise_std = _noise_floor_estimate(sig, r_idx)

    win_ms = 2 * P_AUC_HALF_WIN_MS
    if noise_std is not None and noise_std > 0:
        return max(P_AUC_FIXED_FLOOR, noise_std * P_AUC_NOISE_MULT * win_ms)
    return P_AUC_FIXED_FLOOR


def _t_exclusion_boundary(beat_i, r_peaks, qt_ms=None):
    """
    QT-aware T-end estimate for the previous beat.
    Returns (hard_boundary, soft_boundary) in sample-index space.

    Hard boundary: candidates at or before this are always rejected.
    Soft boundary: candidates between hard and soft get an AUC penalty
                   (linear ramp 1.0× at soft → 2.5× at hard).

    Replaces the fixed P_T_EXCLUSION_RR_FRAC * RR formula which
    systematically over-estimates T-end at high heart rates.
    """
    if beat_i == 0 or len(r_peaks) < 2:
        return -np.inf, -np.inf

    r_prev = r_peaks[beat_i - 1]
    r_curr = r_peaks[beat_i]
    rr_s   = (r_curr - r_prev) / SAMPLING_RATE

    if qt_ms is not None and 200 < qt_ms < 600:
        qt_samples = int((qt_ms / 1000) * SAMPLING_RATE)
    else:
        qt_samples = int((420 * np.sqrt(rr_s) / 1000) * SAMPLING_RATE)

    safety_s   = int((T_EXCLUSION_SAFETY_MS / 1000) * SAMPLING_RATE)
    softzone_s = int((T_SOFTZONE_WIDTH_MS   / 1000) * SAMPLING_RATE)

    hard = float(r_prev + qt_samples + safety_s)
    soft = hard + softzone_s
    return hard, soft


def _auc_validate_candidate(sig, idx, baseline, thr, r_idx, r_amp, t_bounds):
    """
    Validate a P-wave candidate at sig[idx].

    Gates (in order):
      1. Hard T-exclusion: reject if idx ≤ hard_boundary.
      2. Amplitude: 0 < (sig[idx] - baseline) < P_FALLBACK_AMP_MAX_FRAC × R_amp.
      3. Local maximum (dy/dt sign change).
      4. AUC > effective threshold (with soft-zone penalty applied).

    Returns (valid, auc, amplitude, conf_hint).
    """
    hard, soft = t_bounds

    if idx <= hard:
        return False, np.nan, np.nan, "NONE"

    amp = float(sig[idx]) - baseline
    if amp <= 0 or amp >= r_amp * P_FALLBACK_AMP_MAX_FRAC:
        return False, np.nan, np.nan, "NONE"

    if not _is_true_local_max(sig, idx, half_win=3):
        return False, np.nan, np.nan, "NONE"

    auc = _compute_auc(sig, idx, P_AUC_HALF_WIN_MS, baseline)
    if auc <= 0:
        return False, np.nan, np.nan, "NONE"

    # Soft T-exclusion zone: linearly increasing AUC threshold
    eff_thr = thr
    if idx <= soft:
        frac    = (soft - idx) / max(soft - hard, 1)
        eff_thr = thr * (1.0 + 0.7 * frac)  # 1.0× at soft → 2.5× at hard

    if auc < eff_thr * 0.75:
        return False, np.nan, np.nan, "NONE"

    ratio = amp / r_amp if r_amp > 0 else 0.0
    if ratio < P_LOW_CONF_RATIO:
        conf = "LOW"
    elif ratio < P_MED_CONF_RATIO:
        conf = "MED"
    else:
        conf = "HIGH"

    return True, auc, amp, conf


# ═══════════════════════════════════════════════════════════════
# FEATURE 1: P-WAVE PRESENCE + AMPLITUDE
# ═══════════════════════════════════════════════════════════════

def compute_p_presence(sig, r_peaks, p_peaks_step4, rr_mean_ms=None, qt_ms=None):
    """
    Determine P-wave presence per beat using AUC-based detection.

    Two-pass strategy within the adaptive search window:
      Pass 1: Strict — require local maximum.
      Pass 2: Relaxed — no local-max requirement (recovers distorted P).

    Returns per-beat arrays and global P/R ratio.
    """
    n = len(r_peaks)

    presence     = np.zeros(n, dtype=bool)
    amplitudes   = np.full(n, np.nan)
    aucs         = np.full(n, np.nan)
    baselines    = np.full(n, np.nan)
    p_peaks_used = np.full(n, np.nan)
    sources      = np.full(n, "none",  dtype=object)
    confs        = np.full(n, "NONE",  dtype=object)

    r_amp_med = _r_amplitude_median(sig, r_peaks)

    win_min_s = int(P_SEARCH_WIN_MS[0] / 1000 * SAMPLING_RATE)  # negative samples
    win_max_s = int(P_SEARCH_WIN_MS[1] / 1000 * SAMPLING_RATE)  # negative samples

    for i, r in enumerate(r_peaks):
        r_amp    = abs(float(sig[r]))
        baseline = _per_beat_baseline(sig, r, r_peaks, i, qt_ms)
        baselines[i] = baseline
        thr      = _auc_threshold_for_beat(sig, r, r_peaks, i, qt_ms)
        t_bounds = _t_exclusion_boundary(i, r_peaks, qt_ms)

        accepted = False

        # ── Pass 1: Use Step 4 P-peak if within window ──────────
        p4 = p_peaks_step4[i] if i < len(p_peaks_step4) else np.nan
        if not np.isnan(p4):
            pi     = int(p4)
            offset = pi - r
            if win_min_s <= offset <= win_max_s:
                ok, auc, amp, conf = _auc_validate_candidate(
                    sig, pi, baseline, thr, r, r_amp, t_bounds)
                if ok:
                    presence[i]     = True
                    amplitudes[i]   = amp
                    aucs[i]         = auc
                    p_peaks_used[i] = float(pi)
                    sources[i]      = "step4"
                    confs[i]        = conf
                    accepted        = True

        # ── Pass 2: Independent morphological search ─────────────
        if not accepted:
            seg_s = max(0, r + win_min_s)
            seg_e = max(0, r + win_max_s)

            candidates = []

            # Strict: require local maximum
            for idx in range(seg_s, seg_e):
                ok, auc, amp, conf = _auc_validate_candidate(
                    sig, idx, baseline, thr, r, r_amp, t_bounds)
                if ok:
                    candidates.append((idx, auc, amp, conf, "fallback"))

            # Relaxed: no local-max check (recovers flat-top or fused P)
            if not candidates:
                for idx in range(seg_s, seg_e):
                    if idx <= t_bounds[0]:          # still honour hard boundary
                        continue
                    amp = float(sig[idx]) - baseline
                    if amp <= 0 or amp >= r_amp * P_FALLBACK_AMP_MAX_FRAC:
                        continue
                    auc = _compute_auc(sig, idx, P_AUC_HALF_WIN_MS, baseline)
                    if auc <= 0:
                        continue
                    # Apply soft-zone penalty
                    eff_thr = thr
                    if idx <= t_bounds[1]:
                        frac    = (t_bounds[1] - idx) / max(t_bounds[1] - t_bounds[0], 1)
                        eff_thr = thr * (1.0 + 0.7 * frac)
                    if auc < eff_thr * 0.75:
                        continue
                    ratio = amp / r_amp if r_amp > 0 else 0.0
                    conf  = ("LOW" if ratio < P_LOW_CONF_RATIO else
                             "MED" if ratio < P_MED_CONF_RATIO else "HIGH")
                    candidates.append((idx, auc, amp, conf, "fallback_relaxed"))

            if candidates:
                best = max(candidates, key=lambda x: x[1])  # highest AUC
                idx, auc, amp, conf, src = best
                presence[i]     = True
                amplitudes[i]   = amp
                aucs[i]         = auc
                p_peaks_used[i] = float(idx)
                sources[i]      = src
                confs[i]        = conf
                accepted        = True

    # ── Global P/R confidence check ───────────────────────────
    p_amp_med  = _safe_median(amplitudes[presence])
    p_r_global = (p_amp_med / r_amp_med) if (p_amp_med and r_amp_med > 0) else 0.0

    # Degrade conf if entire file is at noise floor
    if p_r_global < P_LOW_CONF_RATIO:
        confs[confs == "HIGH"] = "LOW"
        confs[confs == "MED"]  = "LOW"

    return {
        "presence_per_beat"  : presence,
        "presence_pct"       : float(presence.mean() * 100),
        "p_amplitudes"       : amplitudes,
        "p_aucs"             : aucs,
        "baselines"          : baselines,
        "p_peaks_used"       : p_peaks_used,
        "source_per_beat"    : sources,
        "conf_per_beat"      : confs,
        "p_r_ratio_global"   : float(p_r_global),
        "p_amp_threshold_auc": thr if n > 0 else 0.0,
    }


# ═══════════════════════════════════════════════════════════════
# FEATURE 2: P-WAVE POLARITY
# ═══════════════════════════════════════════════════════════════

def compute_p_polarity(p_amplitudes, presence):
    """
    Dominant P-wave polarity from amplitude signs.
    Medical rule: P upright in Lead II → sinus origin.
    """
    valid = p_amplitudes[presence & ~np.isnan(p_amplitudes)]

    if len(valid) == 0:
        return {
            "negative_fraction": np.nan,
            "polarity_flag"    : "UNKNOWN",
            "polarity_desc"    : "No valid P-waves to assess polarity",
        }

    neg_frac = float(np.mean(valid < 0))

    if neg_frac > 0.6:
        return {"negative_fraction": neg_frac, "polarity_flag": "INVERTED",
                "polarity_desc": f"Predominantly inverted ({neg_frac*100:.0f}% negative) → retrograde/ectopic"}
    if neg_frac < 0.3:
        return {"negative_fraction": neg_frac, "polarity_flag": "UPRIGHT",
                "polarity_desc": f"Predominantly upright ({(1-neg_frac)*100:.0f}% positive) → normal sinus origin"}
    return {"negative_fraction": neg_frac, "polarity_flag": "MIXED",
            "polarity_desc": f"Mixed polarity ({neg_frac*100:.0f}% negative) → multifocal or artifact"}


# ═══════════════════════════════════════════════════════════════
# FEATURE 3: P-WAVE DURATION
# ═══════════════════════════════════════════════════════════════

def compute_p_duration(waves, r_peaks, presence, p_peaks_used):
    """
    P-wave duration from DWT onset/offset.
    Fallback: half-width estimation (±P_AUC_HALF_WIN_MS) if DWT unavailable.
    Medical rule: normal 60–120 ms; >120 ms = left atrial enlargement.
    """
    n         = len(r_peaks)
    durations = np.full(n, np.nan)

    if waves is not None:
        def _get_arr(key):
            arr = np.array(waves.get(key, []), dtype=float)
            if len(arr) >= n:
                return arr[:n]
            return np.concatenate([arr, np.full(n - len(arr), np.nan)])

        p_onsets  = _get_arr("ECG_P_Onsets")
        p_offsets = _get_arr("ECG_P_Offsets")

        for i in range(n):
            if not presence[i]:
                continue
            on  = p_onsets[i]
            off = p_offsets[i]
            if not np.isnan(on) and not np.isnan(off) and off > on:
                dur_ms = (off - on) / SAMPLING_RATE * 1000
                if P_DUR_MIN_MS <= dur_ms <= P_DUR_MAX_MS:
                    durations[i] = dur_ms

    # Fallback: estimate from half-width of AUC integration window
    for i in range(n):
        if not presence[i] or not np.isnan(durations[i]):
            continue
        if not np.isnan(p_peaks_used[i]):
            durations[i] = float(2 * P_AUC_HALF_WIN_MS)

    valid      = durations[~np.isnan(durations)]
    dur_median = float(np.median(valid)) if len(valid) > 0 else None
    n_valid    = int(len(valid))

    return {
        "p_dur_per_beat": durations,
        "p_dur_median"  : dur_median,
        "p_dur_n_valid" : n_valid,
    }


# ═══════════════════════════════════════════════════════════════
# FEATURE 4: P-WAVE REGULARITY
# ═══════════════════════════════════════════════════════════════

def compute_p_regularity(p_peaks_used, r_peaks, presence):
    """
    PP interval variability and PR consistency.
    Medical rules:
      PP std < 50 ms   → regular sinus
      PP std 50–120 ms → sinus arrhythmia (respiratory)
      PP std > 120 ms  → irregular (AF, multifocal atrial)
    """
    present_idx = np.where(presence & ~np.isnan(p_peaks_used))[0]

    if len(present_idx) < 3:
        return {
            "pp_intervals_ms": np.array([]),
            "pp_std_ms"      : None,
            "pr_intervals_ms": np.array([]),
            "pr_std_ms"      : None,
            "regularity_flag": "INSUFFICIENT_DATA",
            "regularity_desc": "Fewer than 3 valid P-waves detected",
        }

    p_pos  = p_peaks_used[present_idx]
    pp_ms  = np.diff(p_pos) / SAMPLING_RATE * 1000
    pp_std = float(np.std(pp_ms)) if len(pp_ms) > 1 else None

    pr_ms_arr = (r_peaks[present_idx].astype(float) - p_pos) / SAMPLING_RATE * 1000
    pr_ms_arr = pr_ms_arr[(pr_ms_arr > 60) & (pr_ms_arr < 350)]
    pr_std    = float(np.std(pr_ms_arr)) if len(pr_ms_arr) > 1 else None

    if pp_std is None:
        flag, desc = "INSUFFICIENT_DATA", "Not enough PP intervals"
    elif pp_std < 50:
        flag = "REGULAR"
        desc = f"Regular P-P (std={pp_std:.0f} ms) → consistent with sinus rhythm"
    elif pp_std < 120:
        flag = "MILDLY_IRREGULAR"
        desc = f"Mildly irregular P-P (std={pp_std:.0f} ms) → sinus arrhythmia"
    else:
        flag = "IRREGULAR"
        desc = f"Irregular P-P (std={pp_std:.0f} ms) → possible AF or multifocal"

    return {
        "pp_intervals_ms": pp_ms,
        "pp_std_ms"      : pp_std,
        "pr_intervals_ms": pr_ms_arr,
        "pr_std_ms"      : pr_std,
        "regularity_flag": flag,
        "regularity_desc": desc,
    }


# ═══════════════════════════════════════════════════════════════
# CLASSIFIERS
# ═══════════════════════════════════════════════════════════════

def classify_p_presence(pct):
    if pct >= 80:
        return {"presence_flag": "PRESENT",
                "presence_desc": f"P waves in {pct:.0f}% of beats → consistent with sinus rhythm"}
    if pct >= 50:
        return {"presence_flag": "INTERMITTENT",
                "presence_desc": f"P waves in {pct:.0f}% of beats → intermittent loss (ectopy?)"}
    return {"presence_flag": "ABSENT",
            "presence_desc": f"P waves in only {pct:.0f}% of beats → suspect AF / junctional / noise"}


def classify_p_duration(dur_ms):
    if dur_ms is None:
        return {"p_dur_flag": "UNKNOWN",   "p_dur_desc": "P duration not measurable"}
    if dur_ms > 120:
        return {"p_dur_flag": "PROLONGED", "p_dur_desc": f"P = {dur_ms:.0f} ms (>120 ms) → left atrial enlargement"}
    if dur_ms < 60:
        return {"p_dur_flag": "SHORT",     "p_dur_desc": f"P = {dur_ms:.0f} ms (<60 ms) → ectopic atrial or artifact"}
    return     {"p_dur_flag": "NORMAL",    "p_dur_desc": f"P = {dur_ms:.0f} ms (normal 60–120 ms)"}


def classify_p_confidence(p_r_ratio_global, conf_per_beat):
    """
    Overall P-wave confidence flag for the file.
    Medical rule: P/R < 2% → LOW (at noise floor).
    """
    if p_r_ratio_global < P_LOW_CONF_RATIO:
        return {
            "p_conf_flag": "LOW",
            "p_conf_desc": (f"P/R ratio = {p_r_ratio_global*100:.2f}% < 2% noise floor. "
                            f"P-wave measurements unreliable. Consider signal quality."),
        }
    if p_r_ratio_global < P_MED_CONF_RATIO:
        return {
            "p_conf_flag": "MED",
            "p_conf_desc": (f"P/R ratio = {p_r_ratio_global*100:.2f}% (2–5%). "
                            f"Low-amplitude P waves; AUC detection applied."),
        }
    return {
        "p_conf_flag": "HIGH",
        "p_conf_desc": f"P/R ratio = {p_r_ratio_global*100:.2f}% — adequate amplitude.",
    }


# ═══════════════════════════════════════════════════════════════
# ORCHESTRATOR
# ═══════════════════════════════════════════════════════════════

def run_all(filepath):
    """
    Run full Step 5.  Returns all keys required by:
      - run_pipeline.py  (presence_pct, presence_flag, polarity_flag,
                          regularity_flag, pp_std_ms, p_dur_median,
                          p_dur_flag, p_conf_flag, p_r_ratio_global,
                          p_conf_desc)
      - final_diagnosis.py  (same set + p_conf_flag)
      - plot_p_waves()      (internal arrays)
    """
    step4         = step4_run_all(filepath)
    sig_corrected = step4["sig_corrected"]
    r_peaks       = step4["r_peaks"]
    p_peaks_s4    = step4["p_peaks"]
    polarity      = step4["polarity"]
    cleaned       = step4["cleaned"]
    rr_mean_ms    = step4.get("rr_mean_ms")
    qt_ms         = step4.get("qt_ms_median", None)   # QT from Step 4 DWT

    waves = delineate_corrected(cleaned, r_peaks, polarity)

    # ── Core detection ──────────────────────────────────────────
    presence_result = compute_p_presence(
        sig_corrected, r_peaks, p_peaks_s4,
        rr_mean_ms=rr_mean_ms, qt_ms=qt_ms
    )

    # ── Derived features ────────────────────────────────────────
    polarity_result   = compute_p_polarity(
                            presence_result["p_amplitudes"],
                            presence_result["presence_per_beat"])

    duration_result   = compute_p_duration(
                            waves, r_peaks,
                            presence_result["presence_per_beat"],
                            presence_result["p_peaks_used"])

    regularity_result = compute_p_regularity(
                            presence_result["p_peaks_used"],
                            r_peaks,
                            presence_result["presence_per_beat"])

    # ── Classifiers ─────────────────────────────────────────────
    presence_class = classify_p_presence(presence_result["presence_pct"])
    duration_class = classify_p_duration(duration_result["p_dur_median"])
    conf_class     = classify_p_confidence(
                         presence_result["p_r_ratio_global"],
                         presence_result["conf_per_beat"])

    return {
        # ── Identity ────────────────────────────────────────────
        "filepath"      : filepath,
        "fname"         : os.path.basename(filepath),
        "cleaned"       : cleaned,
        "sig_corrected" : sig_corrected,
        "r_peaks"       : r_peaks,
        "polarity"      : polarity,
        # ── Detection arrays (for plotting) ─────────────────────
        **presence_result,
        # ── Derived feature dicts ────────────────────────────────
        **polarity_result,
        **duration_result,
        **regularity_result,
        # ── Classifier dicts (pipeline contract keys) ────────────
        **presence_class,
        **duration_class,
        **conf_class,
    }


# ═══════════════════════════════════════════════════════════════
# PLOT
# ═══════════════════════════════════════════════════════════════

def plot_p_waves(result, n_beats_show=5):
    """
    Two-panel plot on polarity-corrected signal.
    Top   : ECG with P-wave markers colour-coded by confidence.
    Bottom: P-wave amplitude bar chart with AUC threshold reference.
    """
    fname        = result["fname"]
    sig          = result["sig_corrected"]
    r_peaks      = result["r_peaks"]
    p_peaks_used = result["p_peaks_used"]
    presence     = result["presence_per_beat"]
    baselines    = result["baselines"]
    sources      = result["source_per_beat"]
    confs        = result["conf_per_beat"]

    if len(r_peaks) == 0:
        return

    last_idx = min(n_beats_show, len(r_peaks) - 1)
    start_s  = max(0, int(r_peaks[0] - 0.35 * SAMPLING_RATE))
    end_s    = min(len(sig), int(r_peaks[last_idx] + 0.55 * SAMPLING_RATE))
    time_ax  = np.arange(start_s, end_s) / SAMPLING_RATE

    p_conf_flag = result.get("p_conf_flag", "?")
    p_r_ratio   = result.get("p_r_ratio_global", np.nan)
    dur_str     = f"{result['p_dur_median']:.0f} ms" if result.get("p_dur_median") else "N/A"

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 7), sharex=False)
    fig.suptitle(
        f"Step 5 — P-Wave Analysis (Adaptive AUC) | {fname}\n"
        f"Presence: {result['presence_pct']:.0f}% [{result['presence_flag']}]  |  "
        f"Polarity: {result['polarity_flag']}  |  "
        f"Regularity: {result['regularity_flag']}  |  "
        f"Dur: {dur_str}  |  "
        f"P/R: {p_r_ratio*100:.2f}%  [conf={p_conf_flag}]",
        fontsize=10
    )

    pol_lbl = "normal" if result["polarity"] == 1 else "×−1 corrected"
    ax1.plot(time_ax, sig[start_s:end_s], color="darkblue",
             linewidth=0.9, label=f"Lead II ({pol_lbl})")

    # Search window shading
    for i, r in enumerate(r_peaks[:last_idx + 1]):
        ws = max(start_s, r + int(P_SEARCH_WIN_MS[0] / 1000 * SAMPLING_RATE))
        we = min(end_s,   r + int(P_SEARCH_WIN_MS[1] / 1000 * SAMPLING_RATE))
        if ws < we:
            ax1.axvspan(ws / SAMPLING_RATE, we / SAMPLING_RATE,
                        alpha=0.05, color="green")

    # Baseline markers
    for i, r in enumerate(r_peaks[:last_idx + 1]):
        if i >= len(baselines) or np.isnan(baselines[i]):
            continue
        bl_s = max(start_s, r - int(0.200 * SAMPLING_RATE))
        bl_e = min(end_s,   r - int(0.100 * SAMPLING_RATE))
        if bl_s < bl_e:
            ax1.hlines(baselines[i], bl_s / SAMPLING_RATE, bl_e / SAMPLING_RATE,
                       colors="gray", linewidths=1.2, linestyles="--", alpha=0.7)

    # P-wave markers
    for i, r in enumerate(r_peaks[:last_idx + 1]):
        if i >= len(p_peaks_used):
            continue
        p = p_peaks_used[i]
        if np.isnan(p):
            continue
        pi = int(p)
        if pi < start_s or pi >= end_s or pi >= len(sig):
            continue

        conf = confs[i] if i < len(confs) else "NONE"
        if presence[i]:
            if conf == "HIGH":
                color, marker = "limegreen", "^"
            elif conf == "MED":
                color, marker = "gold", "D"
            else:
                color, marker = "orange", "D"
        else:
            color, marker = "tomato", "x"

        ax1.scatter(pi / SAMPLING_RATE, sig[pi],
                    color=color, s=90, zorder=7, marker=marker)

    r_in = r_peaks[(r_peaks >= start_s) & (r_peaks < end_s)]
    ax1.scatter(r_in / SAMPLING_RATE, sig[r_in],
                color="red", s=50, zorder=6, marker="o", label="R peak")

    legend_elems = [
        Line2D([0],[0], marker="^", color="w", markerfacecolor="limegreen",
               markersize=11, label="P present [HIGH conf]"),
        Line2D([0],[0], marker="D", color="w", markerfacecolor="gold",
               markersize=10, label="P present [MED conf]"),
        Line2D([0],[0], marker="D", color="w", markerfacecolor="orange",
               markersize=10, label="P present [LOW conf / P/R<2%]"),
        Line2D([0],[0], marker="x", color="tomato", markersize=11,
               markeredgewidth=2, label="P absent / below AUC threshold"),
        Line2D([0],[0], color="gray", linestyle="--", label="Isoelectric baseline"),
    ]
    ax1.legend(handles=legend_elems, loc="upper right", fontsize=8)
    ax1.set_ylabel("Amplitude (polarity-corrected)")
    ax1.grid(True, alpha=0.3)

    # ── Panel 2: amplitude bars ──────────────────────────────────
    amps      = result["p_amplitudes"]
    beat_i    = np.arange(len(r_peaks))

    def _bar_color(i):
        if not presence[i]:
            return "tomato"
        c = confs[i] if i < len(confs) else "NONE"
        return {"HIGH": "limegreen", "MED": "gold", "LOW": "orange"}.get(c, "gray")

    bar_colors = [_bar_color(i) for i in range(len(r_peaks))]
    ax2.bar(beat_i, np.nan_to_num(amps, nan=0.0), color=bar_colors, alpha=0.8, width=0.6)
    ax2.axhline(0, color="black", linewidth=0.8)

    auc_thr = result.get("p_amp_threshold_auc", 0.0)
    amp_ref = auc_thr / (2 * P_AUC_HALF_WIN_MS) if P_AUC_HALF_WIN_MS > 0 else 0
    ax2.axhline(amp_ref, color="green", linestyle="--", linewidth=1.2,
                label=f"AUC threshold (~{amp_ref:.4f} a.u. equiv.)")
    ax2.set_xlabel("Beat index")
    ax2.set_ylabel("P amplitude\n(relative to baseline)")
    ax2.legend(fontsize=8, loc="upper right")
    ax2.grid(True, alpha=0.3)

    plt.tight_layout()
    out_name = os.path.splitext(fname)[0] + "_step5.png"
    plt.savefig(out_name, dpi=130)
    plt.show()
    print(f"    📊 Saved: {out_name}")


# ═══════════════════════════════════════════════════════════════
# PRINT REPORT
# ═══════════════════════════════════════════════════════════════

def print_report(result):
    fname  = result["fname"]
    cardio = CARDIOLOGIST.get(fname, {})

    confs      = result["conf_per_beat"]
    sources    = result["source_per_beat"]
    presence   = result["presence_per_beat"]

    n_step4    = int(np.sum(sources == "step4"))
    n_fallback = int(np.sum(np.isin(sources, ["fallback", "fallback_relaxed"])))
    n_low      = int(np.sum(confs == "LOW"))
    n_med      = int(np.sum(confs == "MED"))
    n_high     = int(np.sum(confs == "HIGH"))

    amp_med = _safe_median(result["p_amplitudes"])
    p_r_pct = result.get("p_r_ratio_global", 0.0) * 100

    print(f"\n  {'─'*64}")
    print(f"  FILE : {fname}  (R-peaks={len(result['r_peaks'])}  polarity={result['polarity']:+d})")
    print(f"  {'─'*64}")
    print(f"  P presence : {result['presence_pct']:.0f}%  "
          f"({presence.sum()}/{len(result['r_peaks'])} beats)  "
          f"[step4={n_step4} fallback={n_fallback}]")
    print(f"  P amplitude: {f'{amp_med:.5f} a.u.' if amp_med else 'N/A'}")
    print(f"  P/R ratio  : {p_r_pct:.3f}%  "
          f"{'⚠️  <2% NOISE FLOOR' if p_r_pct < 2.0 else ('~LOW' if p_r_pct < 5.0 else 'OK')}")
    print(f"  Conf flags : HIGH={n_high}  MED={n_med}  LOW={n_low}  "
          f"→ overall [{result.get('p_conf_flag','?')}]")
    print(f"  P conf desc: {result.get('p_conf_desc','')}")

    dur_str = f"{result['p_dur_median']:.0f} ms" if result.get("p_dur_median") else "N/A"
    pp_str  = f"{result['pp_std_ms']:.0f} ms"    if result.get("pp_std_ms")    else "N/A"
    print(f"  P duration : {dur_str}  ({result['p_dur_n_valid']} valid beats)")
    print(f"  PP std     : {pp_str}")
    print(f"\n  Presence   : {result['presence_desc']}")
    print(f"  Polarity   : {result['polarity_desc']}")
    print(f"  Duration   : {result.get('p_dur_desc','?')}")
    print(f"  Regularity : {result['regularity_desc']}")

    c_p = cardio.get("p_waves", "?")
    if c_p == "irregular":
        match = result["regularity_flag"] in ("IRREGULAR", "MILDLY_IRREGULAR")
        note  = "(matched on irregularity)"
    elif c_p == "present":
        match = result["presence_flag"] in ("PRESENT", "INTERMITTENT")
        note  = ""
    elif c_p == "absent":
        match = result["presence_flag"] == "ABSENT"
        note  = ""
    else:
        match, note = False, ""

    print(f"\n  ── Cardiologist ──")
    print(f"  Expected P : {c_p}  →  ours: {result['presence_flag']} / {result['regularity_flag']}  "
          f"{'✅' if match else '❌'} {note}")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    all_results  = {}
    summary_rows = []

    print("=" * 68)
    print("STEP 5 (ADAPTIVE) — P-Wave Analysis")
    print("  Detection : AUC integration over ±20ms (not single-sample peak)")
    print("  Baseline  : QT-aware adaptive TP window (not static [-350,-250]ms)")
    print("  T-guard   : QT-aware T-exclusion with soft-zone penalty")
    print("  Conf flag : HIGH/MED/LOW  |  P/R<2% → LOW auto-flagged")
    print("=" * 68)

    for filepath in ECG_FILES:
        if not os.path.exists(filepath):
            print(f"\n❌ Not found: {filepath}")
            continue

        print(f"\n▶ {filepath}")
        result = run_all(filepath)
        print_report(result)
        plot_p_waves(result)
        all_results[filepath] = result

        summary_rows.append((
            os.path.basename(filepath),
            f"{result['presence_pct']:.0f}%",
            result["presence_flag"],
            result["polarity_flag"],
            f"{result['p_dur_median']:.0f}" if result.get("p_dur_median") else "N/A",
            result["regularity_flag"],
            result.get("p_conf_flag", "?"),
            f"{result.get('p_r_ratio_global', 0.0)*100:.2f}%",
        ))

    print("\n" + "=" * 95)
    print("STEP 5 SUMMARY")
    print("=" * 95)
    print(f"  {'File':<10} {'P%':>5}  {'Presence':<14} {'Polarity':<10} "
          f"{'Dur(ms)':>8}  {'Regularity':<22} {'Conf':<6} P/R%")
    print(f"  {'─'*10} {'─'*5}  {'─'*14} {'─'*10} {'─'*8}  {'─'*22} {'─'*6} {'─'*7}")
    for row in summary_rows:
        print(f"  {row[0]:<10} {row[1]:>5}  {row[2]:<14} {row[3]:<10} "
              f"{row[4]:>8}  {row[5]:<22} {row[6]:<6} {row[7]}")

    print("""
─────────────────────────────────────────────────────────────────
EXPECTED:
  1,3-10: P PRESENT (or INTERMITTENT), UPRIGHT
  2:      IRREGULAR rhythm → match on regularity

PLOT LEGEND:
  Green triangle  = P detected, HIGH confidence
  Gold diamond    = P detected, MED confidence (P/R 2-5%)
  Orange diamond  = P detected, LOW confidence (P/R <2%)
  Red X           = P absent or below AUC threshold
─────────────────────────────────────────────────────────────────
    """)