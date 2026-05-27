import json
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import *

# Mapping manuel : maladie principale → pages liées sur heart.org
DISEASE_PAGE_GROUPS = {
    "Heart Attack": [
        "about-heart-attacks",
        "warning-signs-of-a-heart-attack",
        "understand-your-risks-to-prevent-a-heart-attack",
        "treatment-of-a-heart-attack",
        "diagnosing-a-heart-attack",
    ],
    "Heart Failure": [
        "what-is-heart-failure",
        "warning-signs-of-heart-failure",
        "causes-and-risks-for-heart-failure",
        "diagnosing-heart-failure",
        "treatment-options-for-heart-failure",
    ],
    "Atrial Fibrillation": [
        "what-is-atrial-fibrillation",
        "what-are-the-symptoms-of-atrial-fibrillation",
        "who-is-at-risk-for-atrial-fibrillation-af-or-afib",
        "treatment-and-prevention-of-atrial-fibrillation",
        "why-atrial-fibrillation-af-or-afib-matters",
    ],
    "Arrhythmia": [
        "about-arrhythmia",
        "symptoms-diagnosis--monitoring-of-arrhythmia",
        "understand-your-risk-for-arrhythmia",
        "prevention--treatment-of-arrhythmia",
    ],
    "Peripheral Artery Disease": [
        "about-peripheral-artery-disease-pad",
        "symptoms-of-pad",
        "understand-your-risk-for-pad",
        "prevention-and-treatment-of-pad",
        "diagnosing-pad",
    ],
    "Cardiomyopathy": [
        "what-is-cardiomyopathy-in-adults",
        "symptoms-and-diagnosis-of-cardiomyopathy",
        "understand-your-risk-for-cardiomyopathy",
    ],
    "Pericarditis": [
        "what-is-pericarditis",
        "symptoms-and-diagnosis-of-pericarditis",
    ],
    "Congenital Heart Disease": [
        "about-congenital-heart-defects",
        "symptoms--diagnosis-of-congenital-heart-defects",
        "understand-your-risk-for-congenital-heart-defects",
        "care-and-treatment-for-congenital-heart-defects",
    ],
    "Metabolic Syndrome": [
        "about-metabolic-syndrome",
        "symptoms-and-diagnosis-of-metabolic-syndrome",
        "your-risk-for-metabolic-syndrome",
        "prevention-and-treatment-of-metabolic-syndrome",
    ],
    "High Blood Pressure": [
        "the-facts-about-high-blood-pressure",
        "health-threats-from-high-blood-pressure",
        "changes-you-can-make-to-manage-high-blood-pressure",
    ],
    "Aneurysm": [
        "what-is-an-aneurysm",
        "types-of-aneurysms",
    ],
    "Heart Valve Disease": [
        "about-heart-valves",
        "understanding-your-heart-valve-treatment-options",
    ],
    "Venous Thromboembolism": [
        "what-is-vte",
        "symptoms-and-diagnosis-of-vte",
        "what-is-excessive-blood-clotting-hypercoagulation",
    ],
}


def load_raw_heart_data():
    """Charge toutes les données brutes de heart.org par slug."""
    raw_by_slug = {}
    heart_json = os.path.join(PROCESSED_DIR, "diseases_heart.json")

    if not os.path.exists(heart_json):
        print("  ❌ diseases_heart.json introuvable")
        return {}

    with open(heart_json, "r", encoding="utf-8") as f:
        diseases = json.load(f)

    for d in diseases:
        slug = d.get("url", "").rstrip("/").split("/")[-1]
        raw_by_slug[slug] = d

    return raw_by_slug


def merge_fields(base, extra):
    seen = set(i.lower()[:40] for i in base)
    result = list(base)
    for item in extra:
        key = item.lower()[:40]
        if key not in seen and item.strip():
            result.append(item)
            seen.add(key)
    return result


def enrich_diseases():
    print("\n🔗 Enrichissement par regroupement de pages\n")

    with open(DISEASES_JSON, "r", encoding="utf-8") as f:
        diseases = json.load(f)

    raw_by_slug = load_raw_heart_data()

    # Indexer les maladies par nom
    disease_by_name = {}
    for d in diseases:
        disease_by_name[d["name"].lower()] = d

    enriched_count = 0

    for disease_name, slugs in DISEASE_PAGE_GROUPS.items():
        key = disease_name.lower()

        # Trouver la maladie dans notre base
        target = None
        for k, d in disease_by_name.items():
            if disease_name.lower() in k or k in disease_name.lower():
                target = d
                break

        if not target:
            # Créer une nouvelle entrée
            target = {
                "name":         disease_name,
                "sources":      ["heart.org"],
                "urls":         [],
                "definition":   "",
                "symptoms":     [],
                "causes":       [],
                "risk_factors": [],
                "treatments":   [],
                "prevention":   []
            }
            diseases.append(target)
            disease_by_name[key] = target

        # Fusionner les données de chaque page liée
        for slug in slugs:
            if slug not in raw_by_slug:
                continue

            page = raw_by_slug[slug]

            if not target["definition"] and page.get("definition"):
                target["definition"] = page["definition"]

            for field in ["symptoms", "causes", "risk_factors",
                          "treatments", "prevention"]:
                if page.get(field):
                    target[field] = merge_fields(
                        target[field], page[field]
                    )

        enriched_count += 1
        print(f"  ✅ {disease_name} — "
              f"{len(target['symptoms'])} symptômes, "
              f"{len(target['causes'])} causes")

    # Stats finales
    print(f"\n  Total : {len(diseases)} maladies")
    with_symptoms = sum(1 for d in diseases if d["symptoms"])
    with_causes   = sum(1 for d in diseases if d["causes"])
    with_def      = sum(1 for d in diseases if d["definition"])
    print(f"  Avec définition : {with_def}/{len(diseases)}")
    print(f"  Avec symptômes  : {with_symptoms}/{len(diseases)}")
    print(f"  Avec causes     : {with_causes}/{len(diseases)}")

    with open(DISEASES_JSON, "w", encoding="utf-8") as f:
        json.dump(diseases, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Fichier enrichi sauvegardé : {DISEASES_JSON}\n")
    return diseases


if __name__ == "__main__":
    enrich_diseases()