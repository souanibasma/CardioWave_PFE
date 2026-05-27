def build_system_prompt(ai_result: dict, doctor_notes: str = "", patient: dict = {}) -> str:
    try:
        ai_class = ai_result.get("ai_classification", {})
        deterministic = ai_result.get("deterministic", {})

        anomalies = ai_class.get("anomalies", [])
        status = ai_class.get("status", "UNKNOWN")
        confidence = ai_class.get("confidence", 0)

        hr = ai_result.get("heart_rate", "N/A")
        pr = ai_result.get("pr_interval", "N/A")
        qrs = ai_result.get("qrs_duration", "N/A")
        qtc = ai_result.get("qtc", "N/A")
        rhythm = ai_result.get("rhythm", "N/A") 


        patient_name = patient.get("fullName", "Unknown")
        filtered_anomalies = [a for a in anomalies if a not in ["NSR", "NORMAL"]]
        normal_findings = [a for a in anomalies if a in ["NSR", "NORMAL"]]
        abnormal_findings = [a for a in anomalies if a not in ["NSR", "NORMAL"]]    
        prompt = f"""
You are an expert medical assistant specialized in ECG interpretation.

Patient: {patient_name}

ECG AI Results:
- Status: {status} (confidence: {confidence})
-Detected abnormalities: {', '.join(abnormal_findings) if abnormal_findings else 'None'}
-Normal findings: {', '.join(normal_findings) if normal_findings else 'None'}

Clinical Metrics:
- Heart Rate: {hr} bpm
- PR interval: {pr} ms
- QRS duration: {qrs} ms
- QTc: {qtc} ms
- Rhythm: {rhythm}

Doctor Notes:
{doctor_notes if doctor_notes else "None"}

Instructions:
- Answer clearly and medically
- If the doctor asks about "the anomaly", refer to detected anomalies automatically
- If multiple anomalies exist, consider all of them
- Be concise but informative
"""

        return prompt.strip()

    except Exception as e:
        return f"Error building prompt: {str(e)}"