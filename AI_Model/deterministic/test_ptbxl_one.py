import os
import numpy as np
import wfdb
import sys

# ===== PATHS =====
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PTBXL_PATH = os.path.join(BASE_DIR, "data", "raw", "ptbxl")
DETERMINISTIC_PATH = os.path.join(BASE_DIR, "deterministic")

# ===== TROUVER UN ECG AUTOMATIQUEMENT (records500) =====
records_path = os.path.join(PTBXL_PATH, "records500")

record_path = None
for root, dirs, files in os.walk(records_path):
    for file in files:
        if file.endswith(".hea"):
            record_path = os.path.join(root, file.replace(".hea", ""))
            print("✅ Found record:", record_path)
            break
    if record_path:
        break

if record_path is None:
    raise Exception("❌ Aucun fichier .hea trouvé dans PTB-XL")

# ===== LOAD ECG =====
record = wfdb.rdsamp(record_path)
signal = record[0]   # shape (5000, 12)

print("📊 Original shape:", signal.shape)

# ===== SÉLECTION DES 4 LEADS (IMPORTANT) =====
# PTB-XL lead order:
# [I, II, III, aVR, aVL, aVF, V1, V2, V3, V4, V5, V6]

lead_I  = signal[:, 0]
lead_II = signal[:, 1]
lead_V1 = signal[:, 6]
lead_V5 = signal[:, 10]

signal_4 = np.stack([lead_I, lead_II, lead_V1, lead_V5], axis=0)

print("✅ New shape (expected 4x5000):", signal_4.shape)

# ===== SAVE EN .NPY =====
test_file = os.path.join(BASE_DIR, "data", "test_ptbxl.npy")
np.save(test_file, signal_4)

print("💾 Saved test ECG:", test_file)

# ===== RUN TON PIPELINE =====
sys.path.append(DETERMINISTIC_PATH)

from run_pipeline import run_file

print("\n🚀 Running deterministic pipeline...\n")

result = run_file(test_file, do_plots=False, verbose=True)

print("\n===== RESULT =====")

# ===== AFFICHAGE SIMPLE (important pour toi) =====
try:
    step4 = result.get("step4", {})
    print("\n📊 Extracted Features:")
    print(f"HR   : {step4.get('hr_bpm')}")
    print(f"PR   : {step4.get('pr_ms')}")
    print(f"QRS  : {step4.get('qrs_ms')}")
    print(f"QTc  : {step4.get('qtc_ms')}")
except:
    print(result)