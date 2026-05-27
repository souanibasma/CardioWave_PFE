# api.py
# ============================================================
# FastAPI — ECG Cascade Pipeline
# POST /predict  →  upload .npy (4,5000)
# GET  /predict/text  →  résultat formaté comme le CLI
# ============================================================

import io
import os
import sys
import json
import tempfile
from typing import Optional

import numpy as np
import torch
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel

# ============================================================
# UTILS JSON SAFE 🔥
# ============================================================

def to_python(obj):
    if isinstance(obj, dict):
        return {k: to_python(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [to_python(v) for v in obj]
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, (np.float32, np.float64)):
        return float(obj)
    elif isinstance(obj, (np.int32, np.int64)):
        return int(obj)
    else:
        return obj
    

# ── Ajout du projet au path ──────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from config import (
    BINARY_MODEL_PATH, MULTICLASS_MODEL_PATH,
    BINARY_THRESHOLD, DEVICE, MODELS_DIR,
    CD_NAMES, HYP_NAMES, IHD_NAMES,
    CD_SIZE, HYP_SIZE, IHD_SIZE,
)
from utils.model_paper      import ECGDualBranchNet
from utils.model_multiclass import ECGMulticlassNet
from utils.model_arr import (
    ECGArrhythmiaNet,
    ARR_LABELS, ARR_DEFAULT_THRESHOLDS, ARR_DESCRIPTIONS,
    BEAT_LABELS, BEAT_DEFAULT_THRESHOLDS, BEAT_DESCRIPTIONS,
)

# ============================================================
# CONFIG & SEUILS
# ============================================================

ARR_MODEL_PATH = os.path.join(MODELS_DIR, "best_ecg_arr_model.pt")

_DEFAULT_CD_THRESHOLDS  = {
    "LBBB": 0.40, "RBBB": 0.45, "BAV1": 0.45,
    "BAV2": 0.25, "BAV3": 0.30, "LAFB": 0.45,
}
_DEFAULT_HYP_THRESHOLDS = {"LVH": 0.45, "RVH": 0.30, "RAE": 0.30}
_DEFAULT_IHD_THRESHOLDS = {"STD": 0.45, "MI": 0.45, "TWI": 0.30, "QWAVE": 0.45}

_TUNED_JSON = os.path.join(MODELS_DIR, "thresholds_tuned.json")


def _load_thresholds():
    if os.path.exists(_TUNED_JSON):
        with open(_TUNED_JSON, encoding="utf-8") as f:
            flat = json.load(f)
        cd  = {n: flat.get(n, _DEFAULT_CD_THRESHOLDS[n])  for n in CD_NAMES}
        hyp = {n: flat.get(n, _DEFAULT_HYP_THRESHOLDS[n]) for n in HYP_NAMES}
        ihd = {n: flat.get(n, _DEFAULT_IHD_THRESHOLDS[n]) for n in IHD_NAMES}
        return cd, hyp, ihd, f"tunés ({_TUNED_JSON})"
    return (_DEFAULT_CD_THRESHOLDS, _DEFAULT_HYP_THRESHOLDS,
            _DEFAULT_IHD_THRESHOLDS, "défaut")


CD_THRESHOLDS, HYP_THRESHOLDS, IHD_THRESHOLDS, _THR_SOURCE = _load_thresholds()

FS  = 500
SEG = int(FS * 2.5)  # 1250

PAPER_MAP = {
    "I":   (0, 0), "aVR": (0, 1), "V1": (0, 2), "V4": (0, 3),
    "II":  (1, 0), "aVL": (1, 1), "V2": (1, 2), "V5": (1, 3),
    "III": (2, 0), "aVF": (2, 1), "V3": (2, 2), "V6": (2, 3),
}
PAPER_ROWS = [
    ["I",   "aVR", "V1", "V4"],
    ["II",  "aVL", "V2", "V5"],
    ["III", "aVF", "V3", "V6"],
]
LEAD_ORDER = ["I","II","III","aVR","aVL","aVF","V1","V2","V3","V4","V5","V6"]

# ============================================================
# PREPROCESSING
# ============================================================

def check_signal_quality(signal_4x5000):
    warnings = []
    for row in range(4):
        sig = signal_4x5000[row]
        s_min, s_max = sig.min(), sig.max()
        if (sig == s_min).sum() / len(sig) > 0.01 or \
           (sig == s_max).sum() / len(sig) > 0.01:
            warnings.append(f"Row {row}: possible clipping")
        for col in range(4):
            seg = sig[col * SEG:(col + 1) * SEG]
            if seg.std() < 0.01:
                lead = PAPER_ROWS[row][col] if row < 3 else "RhythmII"
                warnings.append(f"Lead {lead}: near-flat signal")
        if s_max - s_min > 5.0:
            warnings.append(f"Row {row}: extreme amplitude range")
    return warnings


def extract_branches(signal_4x5000):
    leads_dict = {}
    for lead_name, (row, col) in PAPER_MAP.items():
        start = col * SEG
        leads_dict[lead_name] = signal_4x5000[row, start:start + SEG]
    morph  = np.stack([leads_dict[l] for l in LEAD_ORDER], axis=1)
    rhythm = signal_4x5000[3:4, :].T
    return morph, rhythm, leads_dict


def normalize(signal):
    mean = signal.mean(axis=0)
    std  = signal.std(axis=0)
    std[std < 1e-8] = 1.0
    result = (signal - mean) / std
    return np.nan_to_num(result, nan=0.0, posinf=0.0, neginf=0.0).astype(np.float32)


def build_tensors(morph_raw, rhythm_raw):
    morph_t  = normalize(morph_raw).T[np.newaxis]
    rhythm_t = normalize(rhythm_raw).T[np.newaxis]
    return morph_t, rhythm_t

# ============================================================
# CHARGEMENT MODÈLES (lazy, cached)
# ============================================================

_binary_model     = None
_multiclass_model = None
_arr_model        = None
_arr_thr          = None
_beat_thr         = None


def get_binary_model():
    global _binary_model
    if _binary_model is None:
        m = ECGDualBranchNet().to(DEVICE)
        m.load_state_dict(torch.load(BINARY_MODEL_PATH, map_location=DEVICE, weights_only=True))
        m.eval()
        _binary_model = m
    return _binary_model


def get_multiclass_model():
    global _multiclass_model
    if _multiclass_model is None:
        m = ECGMulticlassNet().to(DEVICE)
        m.load_state_dict(torch.load(MULTICLASS_MODEL_PATH, map_location=DEVICE, weights_only=True))
        m.eval()
        _multiclass_model = m
    return _multiclass_model


def get_arr_model():
    global _arr_model, _arr_thr, _beat_thr
    if _arr_model is not None:
        return _arr_model, _arr_thr, _beat_thr

    if not os.path.exists(ARR_MODEL_PATH):
        return None, ARR_DEFAULT_THRESHOLDS.copy(), BEAT_DEFAULT_THRESHOLDS.copy()

    ckpt  = torch.load(ARR_MODEL_PATH, map_location=DEVICE, weights_only=False)
    model = ECGArrhythmiaNet().to(DEVICE)

    if "arr_thresholds" in ckpt:
        model.load_state_dict(ckpt["model_state"])
        arr_thr  = ckpt.get("arr_thresholds",  ARR_DEFAULT_THRESHOLDS.copy())
        beat_thr = ckpt.get("beat_thresholds", BEAT_DEFAULT_THRESHOLDS.copy())
    else:
        model.load_v1_weights(ARR_MODEL_PATH, device=DEVICE)
        old_thr = ckpt.get("thresholds", ARR_DEFAULT_THRESHOLDS.copy())
        arr_thr = {
            "NSR": old_thr.get("SR",   ARR_DEFAULT_THRESHOLDS["NSR"]),
            "AF":  old_thr.get("AFIB", ARR_DEFAULT_THRESHOLDS["AF"]),
            "AFL": old_thr.get("AFL",  ARR_DEFAULT_THRESHOLDS["AFL"]),
            "SB":  old_thr.get("SB",   ARR_DEFAULT_THRESHOLDS["SB"]),
            "ST":  old_thr.get("ST",   ARR_DEFAULT_THRESHOLDS["ST"]),
            "SVT": old_thr.get("SVT",  ARR_DEFAULT_THRESHOLDS["SVT"]),
            "VF":  old_thr.get("VF",   ARR_DEFAULT_THRESHOLDS["VF"]),
        }
        beat_thr = BEAT_DEFAULT_THRESHOLDS.copy()

    model.eval()
    _arr_model, _arr_thr, _beat_thr = model, arr_thr, beat_thr
    return model, arr_thr, beat_thr

# ============================================================
# INFÉRENCE
# ============================================================

@torch.no_grad()
def predict_binary(morph_t, rhythm_t, threshold):
    model = get_binary_model()
    m = torch.tensor(morph_t).to(DEVICE)
    r = torch.tensor(rhythm_t).to(DEVICE)
    prob = torch.sigmoid(model(m, r)).item()
    return int(prob >= threshold), prob


@torch.no_grad()
def predict_multiclass(morph_t, rhythm_t, borderline_margin=0.0):
    model  = get_multiclass_model()
    m      = torch.tensor(morph_t).to(DEVICE)
    r      = torch.tensor(rhythm_t).to(DEVICE)
    logits = model(m, r)
    probs  = {k: torch.sigmoid(v).cpu().numpy().flatten() for k, v in logits.items()}

    cd_probs  = dict(zip(CD_NAMES,  probs["cd"]))
    hyp_probs = dict(zip(HYP_NAMES, probs["hyp"]))
    ihd_probs = dict(zip(IHD_NAMES, probs["ihd"]))
    cd_preds  = {n: int(p >= CD_THRESHOLDS[n])  for n, p in cd_probs.items()}
    hyp_preds = {n: int(p >= HYP_THRESHOLDS[n]) for n, p in hyp_probs.items()}
    ihd_preds = {n: int(p >= IHD_THRESHOLDS[n]) for n, p in ihd_probs.items()}

    borderlines = {"cd": [], "hyp": [], "ihd": []}
    if borderline_margin > 0:
        for n, p in cd_probs.items():
            if cd_preds[n] == 0 and p >= CD_THRESHOLDS[n] - borderline_margin:
                borderlines["cd"].append(n)
        for n, p in hyp_probs.items():
            if hyp_preds[n] == 0 and p >= HYP_THRESHOLDS[n] - borderline_margin:
                borderlines["hyp"].append(n)
        for n, p in ihd_probs.items():
            if ihd_preds[n] == 0 and p >= IHD_THRESHOLDS[n] - borderline_margin:
                borderlines["ihd"].append(n)

    return ({"cd": cd_probs, "hyp": hyp_probs, "ihd": ihd_probs},
            {"cd": cd_preds, "hyp": hyp_preds, "ihd": ihd_preds},
            borderlines)


@torch.no_grad()
def predict_arr(morph_t, rhythm_t, arr_thresholds, beat_thresholds):
    model = get_arr_model()[0]
    m = torch.tensor(morph_t).to(DEVICE)
    r = torch.tensor(rhythm_t).to(DEVICE)
    out = model.predict_proba(m, r)

    arr_p  = out["arr"].squeeze().cpu().numpy()
    beat_p = out["beat"].squeeze().cpu().numpy()

    arr_probs  = dict(zip(ARR_LABELS,  arr_p.tolist()))
    beat_probs = dict(zip(BEAT_LABELS, beat_p.tolist()))
    arr_preds  = {n: int(arr_probs[n]  >= arr_thresholds.get(n, 0.40)) for n in ARR_LABELS}
    beat_preds = {n: int(beat_probs[n] >= beat_thresholds.get(n, 0.40)) for n in BEAT_LABELS}

    return arr_probs, arr_preds, beat_probs, beat_preds

# ============================================================
# PIPELINE CORE → retourne un dict structuré
# ============================================================

def run_pipeline(signal: np.ndarray, threshold: float = BINARY_THRESHOLD,
                 borderline_margin: float = 0.0) -> dict:

    quality_warnings = check_signal_quality(signal)
    morph_raw, rhythm_raw, _ = extract_branches(signal)
    morph_t, rhythm_t = build_tensors(morph_raw, rhythm_raw)

    # N0
    pred_0, prob_0 = predict_binary(morph_t, rhythm_t, threshold)

    # N1
    probs_n1 = preds_n1 = borderlines = None
    # N1 - Always run to provide full data transparency to the doctor
    probs_n1, preds_n1, borderlines = predict_multiclass(
        morph_t, rhythm_t, borderline_margin)

    # ARR + BEAT
    arr_model, arr_thr, beat_thr = get_arr_model()
    if arr_model is not None:
        arr_probs, arr_preds, beat_probs, beat_preds = predict_arr(
            morph_t, rhythm_t, arr_thr, beat_thr)
    else:
        arr_probs  = {n: 0.0 for n in ARR_LABELS}
        arr_preds  = {n: 0   for n in ARR_LABELS}
        beat_probs = {n: 0.0 for n in BEAT_LABELS}
        beat_preds = {n: 0   for n in BEAT_LABELS}

    # Résumé anomalies
    # NSR (Normal Sinus Rhythm) is excluded — it is NOT an anomaly
    NORMAL_LABELS = {"NSR"}
    findings = []
    if pred_0 == 1 and preds_n1:
        for key, names in [("cd", CD_NAMES), ("hyp", HYP_NAMES), ("ihd", IHD_NAMES)]:
            findings += [n for n in names if preds_n1[key][n] == 1]
    findings += [n for n in ARR_LABELS  if arr_preds.get(n, 0) == 1 and n not in NORMAL_LABELS]
    findings += [n for n in BEAT_LABELS if beat_preds.get(n, 0) == 1]

    return {
        "quality": {
            "ok": len(quality_warnings) == 0,
            "warnings": quality_warnings,
        },
        "n0": {
            "probability_abnormal": round(prob_0, 4),
            "threshold": threshold,
            "prediction": "ANORMAL" if pred_0 == 1 else "NORMAL",
            "confidence": round((prob_0 if pred_0 == 1 else 1 - prob_0), 4),
        },
        "n1": {
            "executed": pred_0 == 1,
            "thresholds_source": _THR_SOURCE,
            "cd": {
                n: {
                    "probability": round(probs_n1["cd"][n], 4),
                    "threshold":   CD_THRESHOLDS[n],
                    "detected":    bool(preds_n1["cd"][n]),
                    "borderline":  n in (borderlines or {}).get("cd", []),
                }
                for n in CD_NAMES
            },
            "hyp": {
                n: {
                    "probability": round(probs_n1["hyp"][n], 4),
                    "threshold":   HYP_THRESHOLDS[n],
                    "detected":    bool(preds_n1["hyp"][n]),
                    "borderline":  n in (borderlines or {}).get("hyp", []),
                }
                for n in HYP_NAMES
            },
            "ihd": {
                n: {
                    "probability": round(probs_n1["ihd"][n], 4),
                    "threshold":   IHD_THRESHOLDS[n],
                    "detected":    bool(preds_n1["ihd"][n]),
                    "borderline":  n in (borderlines or {}).get("ihd", []),
                }
                for n in IHD_NAMES
            },
            "positives": {
                "cd":  [n for n in CD_NAMES  if preds_n1["cd"][n]],
                "hyp": [n for n in HYP_NAMES if preds_n1["hyp"][n]],
                "ihd": [n for n in IHD_NAMES if preds_n1["ihd"][n]],
            },
        },
        "arr": {
            n: {
                "probability": round(arr_probs[n], 4),
                "threshold":   arr_thr.get(n, 0.40),
                "detected":    bool(arr_preds[n]),
                "description": ARR_DESCRIPTIONS.get(n, n),
            }
            for n in ARR_LABELS
        },
        "arr_detected": [n for n in ARR_LABELS if arr_preds[n]],
        "beat": {
            n: {
                "probability": round(beat_probs[n], 4),
                "threshold":   beat_thr.get(n, 0.40),
                "detected":    bool(beat_preds[n]),
                "description": BEAT_DESCRIPTIONS.get(n, n),
            }
            for n in BEAT_LABELS
        },
        "beat_detected": [n for n in BEAT_LABELS if beat_preds[n]],
        "summary": {
            "anomalies": findings,
            "status": "NORMAL" if not findings else "ANORMAL",
        },
    }

# ============================================================
# FORMATAGE TEXTE (identique au CLI)
# ============================================================

def _bar(prob, width=20):
    return "#" * int(prob * width) + " " * (width - int(prob * width))


def format_text_report(result: dict, filename: str = "signal") -> str:
    SEP = "=" * 55
    lines = []

    lines.append(SEP)
    lines.append("  ECG CASCADE PIPELINE  —  N0 → N1 || ARR || BEAT")
    lines.append(SEP)
    lines.append(f"\nFichier  : {filename}")
    lines.append("Shape    : (4, 5000)   ← attendu (4, 5000)")

    q = result["quality"]
    if q["warnings"]:
        lines.append(f"\n⚠️  {len(q['warnings'])} avertissement(s) qualité :")
        for w in q["warnings"]:
            lines.append(f"   • {w}")
    else:
        lines.append("Qualité signal : ✅ aucun artefact")

    # N0
    n0 = result["n0"]
    lines.append(f"\n{SEP}")
    lines.append("  NIVEAU 0 -- Normal / Anormal")
    lines.append(SEP)
    lines.append(f"  Probabilité anormal : {n0['probability_abnormal']:.4f}  (seuil={n0['threshold']})")
    if n0["prediction"] == "NORMAL":
        lines.append("  Prédiction          : ✅ NORMAL")
        lines.append(f"  Confiance           : {n0['confidence']:.1%}")
        lines.append("  🟡 Borderline" if n0['probability_abnormal'] >= 0.30 else "  🟢 Haute confiance NORMAL")
    else:
        lines.append("  Prédiction          : ❌ ANORMAL")
        lines.append(f"  Confiance           : {n0['confidence']:.1%}")
        lines.append("  🔴 Haute confiance ANORMAL — revue urgente"
                     if n0['probability_abnormal'] >= 0.85
                     else "  🟠 ANORMAL — revue clinique recommandée")

    # N1
    n1 = result["n1"]
    if n1["executed"]:
        lines.append(f"\n{SEP}")
        lines.append("  NIVEAU 1 -- CD / HYP / IHD")
        lines.append(f"  Seuils : {n1['thresholds_source']}")
        lines.append(SEP)

        families = [
            ("CD  -- Conduction",   "cd",  CD_NAMES),
            ("HYP -- Hypertrophie", "hyp", HYP_NAMES),
            ("IHD -- Ischémie",     "ihd", IHD_NAMES),
        ]
        for fam_name, key, names in families:
            data = n1[key]
            lines.append(f"\n  {fam_name}")
            lines.append(f"  {'-'*45}")
            for name in names:
                d      = data[name]
                prob   = d["probability"]
                thr    = d["threshold"]
                flag   = (" <-- DÉTECTÉ"     if d["detected"]
                          else " [?] A SURVEILLER" if d["borderline"]
                          else "")
                lines.append(f"    {name:8s} : {prob:.4f}  [{_bar(prob):<20}]  "
                             f"(seuil={thr:.4f}){flag}")
            positives = n1["positives"][key]
            if positives:
                lines.append(f"  -> Positif : {', '.join(positives)}")
            elif not any(data[n]["borderline"] for n in names):
                lines.append("  -> Aucune pathologie détectée")
    else:
        lines.append("\n  ℹ️  N1 non exécuté (ECG Normal)")

    lines.append("  Checkpoint ARR v2 chargé.")

    # ARR
    lines.append(f"\n{SEP}")
    lines.append("  COUCHE ARR -- Arythmies  [toujours actif]")
    lines.append(SEP)
    lines.append("")
    for name in ARR_LABELS:
        d    = result["arr"][name]
        flag = " ◄ DÉTECTÉ" if d["detected"] else ""
        lines.append(f"    {name:5s} : {d['probability']:.4f}  [{_bar(d['probability']):<20}]  "
                     f"(seuil={d['threshold']:.3f}){flag}")
    lines.append("")
    arr_det = result["arr_detected"]
    if arr_det:
        lines.append(f"  -> Arythmie(s) : {', '.join(arr_det)}")
        for lbl in arr_det:
            lines.append(f"     • {lbl} — {result['arr'][lbl]['description']}")
        if "VF" in arr_det:
            lines.append("\n  🚨 FIBRILLATION VENTRICULAIRE — Intervention immédiate")
        elif any(l in arr_det for l in ["AF", "AFL"]):
            lines.append("\n  ⚠️  Arythmie auriculaire — revue urgente")
    else:
        lines.append("  -> Aucune arythmie détectée")

    # BEAT
    lines.append(f"\n{SEP}")
    lines.append("  COUCHE BEAT -- Beats ectopiques  [toujours actif]")
    lines.append(SEP)
    lines.append("")
    for name in BEAT_LABELS:
        d    = result["beat"][name]
        flag = " ◄ DÉTECTÉ" if d["detected"] else ""
        lines.append(f"    {name:5s} : {d['probability']:.4f}  [{_bar(d['probability']):<20}]  "
                     f"(seuil={d['threshold']:.3f}){flag}")
    lines.append("")
    beat_det = result["beat_detected"]
    if beat_det:
        lines.append(f"  -> Beat(s) ectopique(s) : {', '.join(beat_det)}")
        for lbl in beat_det:
            lines.append(f"     • {lbl} — {result['beat'][lbl]['description']}")
    else:
        lines.append("  -> Aucun beat ectopique détecté")

    # Résumé
    lines.append(f"\n{SEP}")
    lines.append("  RÉSUMÉ FINAL")
    lines.append(SEP)
    anomalies = result["summary"]["anomalies"]
    if anomalies:
        lines.append(f"  Anomalies : {', '.join(anomalies)}")
    elif result["n0"]["prediction"] == "ANORMAL":
        lines.append("  ❌ ANORMAL — aucun label spécifique détecté")
        lines.append("  → Revue manuelle recommandée")
    else:
        lines.append("  ✅ Aucune anomalie CD/HYP/IHD/ARR/BEAT détectée")
    lines.append(SEP)

    return "\n".join(lines)

# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="ECG Cascade Pipeline API",
    description="Upload un fichier .npy (4, 5000) — retourne JSON ou texte formaté.",
    version="1.0.0",
)


async def _load_npy_from_upload(file: UploadFile) -> np.ndarray:
    if not file.filename.endswith(".npy"):
        raise HTTPException(status_code=400, detail="Le fichier doit être un .npy")
    content = await file.read()
    try:
        signal = np.load(io.BytesIO(content)).astype(np.float32)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Impossible de lire le .npy : {e}")
    if signal.shape != (4, 5000):
        raise HTTPException(
            status_code=422,
            detail=f"Shape attendu (4, 5000), reçu {signal.shape}",
        )
    return signal


# ── POST /predict → JSON ────────────────────────────────────

@app.post("/predict", summary="Prédiction ECG → JSON structuré")
async def predict_json(
    file: UploadFile = File(..., description="Fichier .npy (4, 5000)"),
    threshold: float = Query(BINARY_THRESHOLD, description="Seuil N0"),
    borderline: float = Query(0.0, description="Marge borderline N1"),
):
    """
    Upload un fichier `.npy` (shape 4×5000) et retourne le résultat
    complet de la pipeline cascade ECG au format JSON.
    """
    signal = await _load_npy_from_upload(file)
    try:
        result = run_pipeline(signal, threshold=threshold,
                              borderline_margin=borderline)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse(content=to_python(result))

# ── POST /predict_from_url → JSON ───────────────────────────

@app.post("/predict_from_url", summary="Prédiction ECG depuis URL")
async def predict_from_url(
    data: dict,
    threshold: float = Query(BINARY_THRESHOLD),
    borderline: float = Query(0.0),
):
    import requests
    import io

    file_url = data.get("file_url")

    if not file_url:
        raise HTTPException(status_code=400, detail="file_url manquant")

    try:
        response = requests.get(file_url)
        signal = np.load(io.BytesIO(response.content)).astype(np.float32)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur chargement fichier: {e}")

    if signal.shape != (4, 5000):
        raise HTTPException(
            status_code=422,
            detail=f"Shape attendu (4,5000), reçu {signal.shape}"
        )

    try:
        result = run_pipeline(signal, threshold=threshold,
                              borderline_margin=borderline)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return JSONResponse(content=to_python(result))

# ── POST /predict/text → texte CLI ──────────────────────────

@app.post("/predict/text", summary="Prédiction ECG → texte formaté (style CLI)")
async def predict_text(
    file: UploadFile = File(..., description="Fichier .npy (4, 5000)"),
    threshold: float = Query(BINARY_THRESHOLD, description="Seuil N0"),
    borderline: float = Query(0.0, description="Marge borderline N1"),
):
    """
    Identique à `/predict` mais retourne le rapport en texte brut,
    exactement comme la sortie du script CLI.
    """
    signal = await _load_npy_from_upload(file)
    try:
        result = run_pipeline(signal, threshold=threshold,
                              borderline_margin=borderline)
        report = format_text_report(result, filename=file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return PlainTextResponse(content=report)


# ── GET /health ──────────────────────────────────────────────

@app.get("/health", summary="Vérification de l'état de l'API")
def health():
    return {
        "status": "ok",
        "device": str(DEVICE),
        "thresholds_source": _THR_SOURCE,
        "arr_model_found": os.path.exists(ARR_MODEL_PATH),
    }


# ── GET / ────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
def root():
    return {"message": "ECG Cascade API — voir /docs pour la documentation."}


# ============================================================
# LANCEMENT DIRECT
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8001, reload=False)