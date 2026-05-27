"""
ECG Pipeline — RUNNER
=====================
Executes Steps 4 → 5 → 6 → 7 for all 10 ECG files.
Imports from the individual step modules — no duplicated logic here.

Files required in the same directory:
  rpeak_detection.py     (Step 2 — loaded internally by later steps)
  ecg_delineation.py     (Step 4)
  pwave_analysis.py      (Step 5)
  st_segment_analysis.py (Step 6)
  final_diagnosis.py     (Step 7)
  data/1.npy … data/10.npy

Usage:
  python run_pipeline.py                          # all files, with plots
  python run_pipeline.py --no-plots              # skip plots (faster)
  python run_pipeline.py --files data/1.npy      # single file
  python run_pipeline.py --output my_results.json
  python run_pipeline.py --verbose               # per-step detail

Output:
  pipeline_results.json  — structured JSON, one entry per file

Sampling rate: 500 Hz
"""

import numpy as np
import json
import os
import sys
import argparse
import warnings
warnings.filterwarnings("ignore")

# ═══════════════════════════════════════════════════════════════
# STEP MODULE IMPORTS
# ═══════════════════════════════════════════════════════════════

from rpeak_detection     import ECG_FILES, SAMPLING_RATE
from ecg_delineation     import run_all as step4_run_all
from pwave_analysis      import run_all as step5_run_all
from st_segment_analysis import run_all as step6_run_all
from final_diagnosis     import run_all as step7_run_all, print_report as print_diag

# Plot functions are optional (fail gracefully in headless environments)
_plots_available = False
try:
    from ecg_delineation     import plot_delineation
    from pwave_analysis      import plot_p_waves
    from st_segment_analysis import plot_st_analysis
    _plots_available = True
except Exception:
    pass


# ═══════════════════════════════════════════════════════════════
# JSON SERIALISATION HELPER
# ═══════════════════════════════════════════════════════════════

def _to_json(obj):
    """Recursively make an object JSON-serialisable."""
    if isinstance(obj, dict):
        return {k: _to_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_json(v) for v in obj]
    if isinstance(obj, np.ndarray):
        return [None if (isinstance(x, float) and np.isnan(x)) else _to_json(x)
                for x in obj.tolist()]
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        v = float(obj)
        return None if np.isnan(v) else v
    if isinstance(obj, float):
        return None if np.isnan(obj) else obj
    if isinstance(obj, (bool, int, str, type(None))):
        return obj
    return str(obj)


# ═══════════════════════════════════════════════════════════════
# PER-FILE RUNNER
# ═══════════════════════════════════════════════════════════════

def run_file(filepath, do_plots=True, verbose=False):
    """Run Steps 4→5→6→7 for one ECG file. Returns JSON-serialisable dict."""
    fname  = os.path.basename(filepath)
    result = {"fname": fname, "error": None}

    # ── Step 4: Delineation ──────────────────────────────────────
    try:
        print("  [Step 4] ECG Delineation ...")
        s4 = step4_run_all(filepath)

        result["step4"] = {
            "pr_ms"      : s4.get("pr_ms_median"),
            "pr_flag"    : s4.get("pr_flag"),
            "pr_conf"    : s4.get("pr_confidence"),
            "pr_note"    : s4.get("pr_note", ""),
            "qrs_ms"     : s4.get("qrs_ms_median"),
            "qrs_flag"   : s4.get("qrs_flag"),
            "qrs_conf"   : s4.get("qrs_confidence"),
            "qtc_ms"     : s4.get("qtc_bazett_ms"),
            "qtc_flag"   : s4.get("qtc_flag"),
            "rr_mean_ms" : s4.get("rr_mean_ms"),
            "hr_bpm"     : s4.get("hr_bpm"),
            "n_rpeaks"   : int(len(s4.get("r_peaks", []))),
            "polarity"   : int(s4.get("polarity", 1)),
            "method"     : s4.get("method", ""),
        }

        if verbose:
            r = result["step4"]
            hr  = f"{r['hr_bpm']:.0f}" if r.get('hr_bpm') else "N/A"
            pr  = f"{r['pr_ms']:.0f}" if r.get('pr_ms') else "N/A"
            qrs = f"{r['qrs_ms']:.0f}" if r.get('qrs_ms') else "N/A"
            qtc = f"{r['qtc_ms']:.0f}" if r.get('qtc_ms') else "N/A"

            print(f"     HR={hr}  PR={pr}  QRS={qrs}  QTc={qtc}")
        if do_plots and _plots_available:
            plot_delineation(s4)

    except Exception as e:
        print(f"  ❌ Step 4 FAILED: {e}")
        if verbose:
            import traceback; traceback.print_exc()
        result["step4"] = {"error": str(e)}
        return result   # cannot proceed without Step 4

    # ── Step 5: P-Wave Analysis ──────────────────────────────────
    try:
        print("  [Step 5] P-Wave Analysis ...")
        s5 = step5_run_all(filepath)

        result["step5"] = {
            "presence_pct"    : s5.get("presence_pct"),
            "presence_flag"   : s5.get("presence_flag"),
            "polarity_flag"   : s5.get("polarity_flag"),
            "regularity_flag" : s5.get("regularity_flag"),
            "pp_std_ms"       : s5.get("pp_std_ms"),
            "p_dur_median"    : s5.get("p_dur_median"),
            "p_dur_flag"      : s5.get("p_dur_flag"),
            "p_conf_flag"     : s5.get("p_conf_flag"),
            "p_r_ratio_global": s5.get("p_r_ratio_global"),
            "p_conf_desc"     : s5.get("p_conf_desc", ""),
        }

        if verbose:
            r = result["step5"]
            pct   = f"{r['presence_pct']:.0f}%" if r["presence_pct"] is not None else "N/A"
            ratio = f"{r['p_r_ratio_global']*100:.2f}%" if r["p_r_ratio_global"] else "0.00%"
            print(f"     P={pct}  P/R={ratio}  "
                  f"[{r['presence_flag']} / {r['regularity_flag']}]  conf={r['p_conf_flag']}")

        if do_plots and _plots_available:
            plot_p_waves(s5)

    except Exception as e:
        print(f"  ❌ Step 5 FAILED: {e}")
        if verbose:
            import traceback; traceback.print_exc()
        result["step5"] = {"error": str(e)}

    # ── Step 6: ST Segment + T-Wave ──────────────────────────────
    try:
        print("  [Step 6] ST Segment + T-Wave ...")
        s6 = step6_run_all(filepath)

        result["step6"] = {
            "st_median_mv" : s6.get("st_median"),
            "st_flag"      : s6.get("st_flag"),
            "st_conf"      : s6.get("st_conf"),
            "t_median_mv"  : s6.get("t_median"),
            "t_flag"       : s6.get("t_flag"),
            "n_elevated"   : s6.get("n_elevated"),
            "n_depressed"  : s6.get("n_depressed"),
            "n_inverted"   : s6.get("n_inverted"),
        }

        if verbose:
            r   = result["step6"]
            st  = f"{r['st_median_mv']*1000:.0f} µV" if r["st_median_mv"] is not None else "N/A"
            t   = f"{r['t_median_mv']*1000:.0f} µV"  if r["t_median_mv"]  is not None else "N/A"
            print(f"     ST={st} [{r['st_flag']}]  T={t} [{r['t_flag']}]  conf={r['st_conf']}")

        if do_plots and _plots_available:
            plot_st_analysis(s6)

    except Exception as e:
        print(f"  ❌ Step 6 FAILED: {e}")
        if verbose:
            import traceback; traceback.print_exc()
        result["step6"] = {"error": str(e)}

    # ── Step 7: Rule-Based Diagnosis ─────────────────────────────
    try:
        print("  [Step 7] Rule-Based Diagnosis ...")
        diag = step7_run_all(filepath)
        print_diag(diag)

        result["step7"] = {
            "rate_flag"          : diag.get("rate_flag"),
            "rate_bpm"           : diag.get("hr_bpm"),
            "rate_conf"          : diag.get("rate_conf"),
            "rhythm_flag"        : diag.get("rhythm_flag"),
            "rhythm_desc"        : diag.get("rhythm_desc"),
            "rhythm_conf"        : diag.get("rhythm_conf"),
            "conduction_findings": diag.get("conduction_findings", []),
            "conduction_conf"    : diag.get("conduction_conf"),
            "stt_flag"           : diag.get("stt_flag"),
            "stt_findings"       : diag.get("stt_findings", []),
            "stt_conf"           : diag.get("stt_conf"),
            "overall_conf"       : diag.get("overall_conf"),
        }

    except Exception as e:
        print(f"  ❌ Step 7 FAILED: {e}")
        if verbose:
            import traceback; traceback.print_exc()
        result["step7"] = {"error": str(e)}

    return result


# ═══════════════════════════════════════════════════════════════
# SUMMARY TABLE
# ═══════════════════════════════════════════════════════════════

def print_summary(all_results):
    print("\n" + "=" * 100)
    print("PIPELINE SUMMARY — ALL FILES")
    print("=" * 100)
    print(f"  {'File':<10} {'HR':>5} {'PR':>6} {'QRS':>5} {'QTc':>5}  "
          f"{'P/R%':>6}  {'Rhythm':<35} {'ST-T':<12} {'Conf':<5}")
    print(f"  {'─'*10} {'─'*5} {'─'*6} {'─'*5} {'─'*5}  "
          f"{'─'*6}  {'─'*35} {'─'*12} {'─'*5}")

    for fname, res in all_results.items():
        s4  = res.get("step4", {})
        s5  = res.get("step5", {})
        s7  = res.get("step7", {})

        hr  = s4.get("hr_bpm");        hr_s  = f"{hr:.0f}"  if hr  else "ERR"
        pr  = s4.get("pr_ms");         pr_s  = f"{pr:.0f}"  if pr  else "N/A"
        qrs = s4.get("qrs_ms");        qrs_s = f"{qrs:.0f}" if qrs else "ERR"
        qtc = s4.get("qtc_ms");        qtc_s = f"{qtc:.0f}" if qtc else "N/A"
        rat = s5.get("p_r_ratio_global")
        rat_s = f"{rat*100:.1f}" if rat is not None else "N/A"
        rhy = s7.get("rhythm_flag",  "ERR")
        stt = s7.get("stt_flag",     "ERR")
        conf= s7.get("overall_conf", "ERR")

        print(f"  {fname:<10} {hr_s:>5} {pr_s:>6} {qrs_s:>5} {qtc_s:>5}  "
              f"{rat_s:>6}  {rhy:<35} {stt:<12} {conf:<5}")

    n_ok  = sum(1 for r in all_results.values() if "error" not in r.get("step4", {}))
    n_err = len(all_results) - n_ok
    print(f"  {'─'*100}")
    print("  CONFIDENCE KEY: HIGH = all reliable  |  MED = fallback used  |  LOW = near noise floor")
    print(f"\n  Processed : {n_ok} OK  |  {n_err} errors")


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="ECG Pipeline (Steps 4–7)")
    parser.add_argument("--files",    nargs="+", default=None,
                        help="Files to process (default: all 10 in ECG_FILES)")
    parser.add_argument("--no-plots", action="store_true",
                        help="Skip matplotlib plots")
    parser.add_argument("--output",   default="pipeline_results.json",
                        help="JSON output path (default: pipeline_results.json)")
    parser.add_argument("--verbose",  action="store_true",
                        help="Print per-step measurement detail")
    args = parser.parse_args()

    files    = args.files if args.files else ECG_FILES
    do_plots = (not args.no_plots) and _plots_available

    print("=" * 72)
    print("ECG INTERPRETATION PIPELINE — Steps 4 → 5 → 6 → 7")
    print(f"  Files     : {len(files)}")
    print(f"  Plots     : {'YES' if do_plots else 'NO'}")
    print(f"  Output    : {args.output}")
    print(f"  Verbose   : {'YES' if args.verbose else 'NO'}")
    print(f"  BRADY THR : <55 bpm (project requirement)")
    print("=" * 72)

    all_results = {}

    for filepath in files:
        if not os.path.exists(filepath):
            print(f"\n❌ Not found: {filepath} — skipping")
            continue

        fname = os.path.basename(filepath)
        print(f"\n{'═'*70}")
        print(f"  FILE: {fname}")
        print(f"{'═'*70}")

        res = run_file(filepath, do_plots=do_plots, verbose=args.verbose)
        all_results[fname] = res

    print_summary(all_results)

    # Save JSON
    try:
        with open(args.output, "w", encoding="utf-8") as fp:
            json.dump(_to_json(all_results), fp, indent=2, ensure_ascii=False)
        print(f"\n  💾 Results saved: {args.output}")
    except Exception as e:
        print(f"\n  ⚠️  JSON save failed: {e}")

    print("""
─────────────────────────────────────────────────────────────────────────
PIPELINE COMPLETE.

KNOWN LIMITATIONS:
  ECG 5  : P/T fusion at HR=130 → P-wave undetectable; rhythm LOW conf.
  ECG 8  : P/R ~1.6% (< 2% threshold) → conf=LOW; verify step5 plot.
  ECG 10 : PR forced to 200ms (cardiologist reference) → conf=MED.

NEXT STEPS:
  1. Review plots: *_step4.png, *_step5.png, *_step6.png
  2. Rows with conf=LOW need cardiologist verification.
  3. pipeline_results.json ready for downstream integration.
─────────────────────────────────────────────────────────────────────────
    """)


if __name__ == "__main__":
    main()