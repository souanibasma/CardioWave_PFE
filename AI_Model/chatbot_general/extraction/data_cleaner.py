import json
import os
import re
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import *

SKIP_NAME_KEYWORDS = [
    "personal stories", "tools and resources", "resources", "faq",
    "webinar", "podcast", "video", "watch", "discussion guide",
    "caregiver", "tips for", "how to manage", "how to measure",
    "getting", "living with", "life after", "recovering",
    "understanding", "learn", "meet the", "debunking",
    "what women", "ladies", "latino", "south asian", "women:",
    "survived", "can you", "is there", "when to call",
    "you can lower", "protecting your", "the link between",
    "hidden factors", "indoor air", "telehealth", "vaping",
    "long covid", "flu", "covid", "strep", "rsv",
    "dental", "smiles", "sodium", "salt", "menopause",
    "diabetes and", "blood pressure explained",
    "preparing for", "managing your", "taking care",
    "find high blood", "changes you can",
    "presión", "¿qué", "¿cuánta", "¿estoy", "señales",
    "ejercicios", "diagnóstico", "presion", "cuanta",
    "doctor, ha", "los síntomas", "las diferencias",
    "las causas", "¿qué causa", "cuando debes",
    "paro cardíaco", "enfermedad arterial periférica",
    "r.á.p.i.d.o", "chd real", "impact of",
    "facts about high blood", "blood pressure readings",
    "health threats from", "why pad matters",
    "pad? the facts", "pad personal", "pad resources",
    "causing your chest", "heart-brain", "future of",
    "91 days", "90 days", "first 90",
    "monitor", "rehab faq", "eligible",
    "vaccination", "discussion"
]

VALID_DISEASE_KEYWORDS = [
    "heart attack", "heart failure", "heart valve", "heart disease",
    "coronary", "artery disease", "arrhythmia", "atrial fibrillation",
    "afib", "stroke", "angina", "cardiomyopathy", "endocarditis",
    "pericarditis", "aneurysm", "peripheral artery", "pad",
    "thrombosis", "embolism", "hypertension", "high blood pressure",
    "atherosclerosis", "cardiac arrest", "ventricular", "bradycardia",
    "tachycardia", "myocarditis", "congenital heart", "metabolic syndrome",
    "hypercoagulation", "blood clotting", "aortic", "stenosis",
    "fibrillation", "heart block", "chest pain", "cardiac"
]


def is_valid_disease(disease):
    name = disease.get("name", "").lower()
    if any(kw in name for kw in SKIP_NAME_KEYWORDS):
        return False
    if any(kw in name for kw in VALID_DISEASE_KEYWORDS):
        return True
    has_data = (
        len(disease.get("symptoms", [])) > 0 or
        len(disease.get("causes", [])) > 0 or
        len(disease.get("risk_factors", [])) > 0
    )
    return has_data


def clean_text(text):
    if not text:
        return ""
    text = re.sub(r'\(link opens in new window\)', '', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def clean_list(items):
    cleaned = []
    seen = set()
    for item in items:
        item = clean_text(item)
        if len(item) < 5 or len(item) > 300:
            continue
        key = item.lower()[:40]
        if key not in seen:
            seen.add(key)
            cleaned.append(item)
    return cleaned


def clean_data():
    print("\n🧹 Nettoyage et filtrage des données\n")

    with open(DISEASES_JSON, "r", encoding="utf-8") as f:
        diseases = json.load(f)

    print(f"  Avant nettoyage : {len(diseases)} entrées")

    cleaned = []
    for d in diseases:
        if not is_valid_disease(d):
            continue
        d["definition"]   = clean_text(d.get("definition", ""))
        d["symptoms"]     = clean_list(d.get("symptoms", []))
        d["causes"]       = clean_list(d.get("causes", []))
        d["risk_factors"] = clean_list(d.get("risk_factors", []))
        d["treatments"]   = clean_list(d.get("treatments", []))
        d["prevention"]   = clean_list(d.get("prevention", []))
        cleaned.append(d)

    print(f"  Après nettoyage : {len(cleaned)} maladies valides")

    with_def      = sum(1 for d in cleaned if d["definition"])
    with_symptoms = sum(1 for d in cleaned if d["symptoms"])
    with_causes   = sum(1 for d in cleaned if d["causes"])

    print(f"\n  Avec définition : {with_def}/{len(cleaned)}")
    print(f"  Avec symptômes  : {with_symptoms}/{len(cleaned)}")
    print(f"  Avec causes     : {with_causes}/{len(cleaned)}")

    with open(DISEASES_JSON, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Fichier nettoyé sauvegardé : {DISEASES_JSON}\n")
    return cleaned


if __name__ == "__main__":
    clean_data()