# config.py
# ============================================================
# Centralized configuration for the ECG multiclass pipeline
# CD (Conduction) + HYP (Hypertrophy) + IHD (Ischaemia)
# ============================================================

import os

# ── PROJECT STRUCTURE ────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Raw data (WFDB format — .dat + .hea)
PTBXL_PATH   = os.path.join(BASE_DIR, "data", "raw", "ptbxl")
CHAPMAN_PATH = os.path.join(BASE_DIR, "data", "raw", "chapman")
GEORGIA_PATH = os.path.join(BASE_DIR, "data", "raw", "georgia")

# PTB-XL metadata CSV (labels stored here, not in .hea)
PTBXL_CSV = os.path.join(PTBXL_PATH, "ptbxl_database.csv")

# Preprocessed data — binary model (existing, do not modify)
BINARY_DATA_PATH = os.path.join(BASE_DIR, "data", "ptbxl_processed_combined")

# Preprocessed data — multiclass model (new, will be created)
MULTICLASS_DATA_PATH = os.path.join(BASE_DIR, "data", "ptbxl_processed_multiclass")

# Saved models
MODELS_DIR             = os.path.join(BASE_DIR, "models")
BINARY_MODEL_PATH      = os.path.join(MODELS_DIR, "best_ecg_paper_model.pt")
MULTICLASS_MODEL_PATH  = os.path.join(MODELS_DIR, "best_ecg_multiclass_model.pt")

# Inference outputs
INFERENCE_OUTPUT_DIR = os.path.join(BASE_DIR, "data_sample", "inference_outputs")

# ── SIGNAL CONSTANTS ─────────────────────────────────────────
FS     = 500            # Sampling frequency (Hz)
SEG    = int(FS * 2.5)  # 1250 samples — one lead segment (2.5s)
RHYTHM = int(FS * 10.0) # 5000 samples — full rhythm strip (10s)

LEAD_ORDER = ["I", "II", "III", "aVR", "aVL", "aVF",
              "V1", "V2", "V3", "V4", "V5", "V6"]

# Paper ECG layout — lead → (lead_index_in_LEAD_ORDER, time_column)
PAPER_LAYOUT = {
    "I"  : (0,  0), "aVR": (3,  1), "V1" : (6,  2), "V4" : (9,  3),
    "II" : (1,  0), "aVL": (4,  1), "V2" : (7,  2), "V5" : (10, 3),
    "III": (2,  0), "aVF": (5,  1), "V3" : (8,  2), "V6" : (11, 3),
}

# Lead name aliases for Chapman/Georgia datasets
LEAD_NAME_MAP = {
    "-aVR": "aVR", "AVR": "aVR", "AVL": "aVL", "AVF": "aVF",
    "v1": "V1", "v2": "V2", "v3": "V3",
    "v4": "V4", "v5": "V5", "v6": "V6",
}

# ── LABEL MAPPINGS — SNOMED-CT → class index ─────────────────

# CD : Conduction Disorders — 6 classes
CD_LABELS = {
    713426002: 0,   # LBBB  (Complete left bundle branch block)
    713427006: 1,   # RBBB  (Complete right bundle branch block)
    270492004: 2,   # BAV1  (1st degree AV block)
    195042002: 3,   # BAV2  (2nd degree AV block — Mobitz II)
    27885002:  4,   # BAV3  (3rd degree / complete AV block)
    445118002: 5,   # LAFB  (Left anterior fascicular block)
}
CD_NAMES  = ["LBBB", "RBBB", "BAV1", "BAV2", "BAV3", "LAFB"]
CD_SIZE   = len(CD_LABELS)   # 6

# HYP : Hypertrophies — 3 classes
# LAE retiré : 7 samples total, pas entraînable
HYP_LABELS = {
    55827005:       0,   # LVH  (Left ventricular hypertrophy)
    67751000119106: 1,   # RVH  (Right ventricular hypertrophy)
    446358003:      2,   # RAE  (Right atrial enlargement)
}
HYP_NAMES = ["LVH", "RVH", "RAE"]
HYP_SIZE  = len(HYP_LABELS)  # 3

# IHD : Ischaemia/Infarct — 4 classes
# STE retiré : 0 samples dans Chapman/Georgia, PTB-XL en a peu aussi
IHD_LABELS = {
    164930006: 0,   # STD   (ST depression)
    57054005:  1,   # MI    (Myocardial infarction)
    164931005: 2,   # TWI   (T-wave inversion)
    164934002: 3,   # QWAVE (Pathological Q wave)
}
IHD_NAMES = ["STD", "MI", "TWI", "QWAVE"]
IHD_SIZE  = len(IHD_LABELS)  # 4

# Classes rares (< ~300 records) — seront sur-échantillonnées
# Après PTB-XL fix, on réévaluera MI/RVH/RAE
RARE_CD_INDICES  = [3, 4]   # BAV2, BAV3
RARE_HYP_INDICES = [1, 2]   # RVH, RAE
RARE_IHD_INDICES = [1]      # MI
RARE_AUG_FACTOR  = 3        # dupliquer 3× les samples rares

# ── TRAINING HYPERPARAMETERS ─────────────────────────────────

# Shared across binary and multiclass
BATCH_SIZE = 64
EPOCHS     = 60
LR         = 1e-4
PATIENCE   = 12
VAL_SPLIT  = 0.12   # 12% of train set used for validation
TEST_SPLIT = 0.10   # 10% held out at preprocessing time

# Multiclass-specific
LOSS_WEIGHTS = {
    "cd":  1.0,   # weight of CD head loss in total loss
    "hyp": 1.0,   # weight of HYP head loss
    "ihd": 1.0,   # weight of IHD head loss
}

# Binary model inference threshold (best F1 from training sweep)
BINARY_THRESHOLD = 0.45

# ── HARDWARE ─────────────────────────────────────────────────
import torch
DEVICE      = "cuda" if torch.cuda.is_available() else "cpu"
NUM_WORKERS = max(1, os.cpu_count() - 1)

# ── REPRODUCIBILITY ──────────────────────────────────────────
SEED = 42