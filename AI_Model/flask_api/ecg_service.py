import os
import sys

# Ensure the parent directory is in the path to import from 'deterministic'
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, '..'))
deterministic_dir = os.path.join(parent_dir, 'deterministic')

if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
if deterministic_dir not in sys.path:
    sys.path.insert(0, deterministic_dir)

from deterministic.run_pipeline import run_file

def analyze_ecg(file_path):
    """
    Service function that wraps the deterministic pipeline.
    Calls run_file, extracts requested variables, derives diagnosis, 
    and returns a structured dictionary.
    """
    # 1. Run the deterministic pipeline
    # We turn off plots and verbose logs for the API
    result = run_file(file_path, do_plots=False, verbose=False)
    
    # Check if pipeline failed early (e.g. at step 4)
    if "error" in result.get("step4", {}):
        raise ValueError(f"Pipeline error at step 4: {result['step4'].get('error')}")
        
    # 2. Extract Data
    step4 = result.get('step4', {})
    step7 = result.get('step7', {})
    
    # Intervals from step 4
    hr_bpm = step4.get('hr_bpm')
    pr_ms = step4.get('pr_ms')
    qrs_ms = step4.get('qrs_ms')
    qtc_ms = step4.get('qtc_ms')
    
    # Details from step 7
    rate_flag = step7.get('rate_flag')
    rhythm = step7.get('rhythm_flag', 'UNKNOWN')
    conduction = step7.get('conduction_findings', [])
    stt = step7.get('stt_findings', [])
    confidence = step7.get('overall_conf', 'UNKNOWN')
    
    # 3. Generate Simple "Diagnosis" Summary
    # Priority:
    # 1. BRADYCARDIA / TACHYCARDIA (from rate_flag)
    # 2. AV_BLOCK_1 (if conduction contains PR issues)
    # 3. Otherwise NORMAL
    diagnosis = "NORMAL"
    
    if rate_flag in ["BRADYCARDIA", "TACHYCARDIA"]:
        diagnosis = rate_flag
    else:
        # Check if conduction array contains any string indicating a PR issue / AV_BLOCK_1
        has_av_block = any(
            "PR" in str(c).upper() or "AV_BLOCK_1" in str(c).upper() 
            for c in conduction
        )
        if has_av_block:
            diagnosis = "AV_BLOCK_1"
            
    # 4. Construct response dictionary
    response = {
        "status": "success",
        "data": {
            "intervals": {
                "hr": hr_bpm,
                "pr": pr_ms,
                "qrs": qrs_ms,
                "qtc": qtc_ms
            },
            "diagnosis": diagnosis,
            "confidence": confidence,
            "details": {
                "rhythm": rhythm,
                "conduction": conduction,
                "stt": stt
            }
        },
        "raw_result": result  # The full output from run_file
    }
    
    return response
