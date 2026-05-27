import requests
import json
import time
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import *

CARDIOVASCULAR_TERMS = [
    "heart attack", "heart failure", "coronary artery disease",
    "hypertension", "cardiac arrhythmia", "atrial fibrillation",
    "stroke", "angina pectoris", "cardiomyopathy", "endocarditis",
    "pericarditis", "aortic aneurysm", "peripheral artery disease",
    "deep vein thrombosis", "pulmonary embolism", "heart valve disease",
    "congenital heart disease", "atherosclerosis", "cardiac arrest",
    "ventricular fibrillation", "bradycardia", "tachycardia",
    "myocarditis", "rheumatic heart disease", "aortic stenosis"
]

WIKIPEDIA_API = "https://en.wikipedia.org/api/rest_v1/page/summary"


def fetch_wikipedia(term):
    slug = term.replace(" ", "_")
    url  = f"{WIKIPEDIA_API}/{slug}"
    try:
        response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  ⚠️  Status {response.status_code} pour '{term}'")
            return None
    except Exception as e:
        print(f"  ❌ Erreur pour '{term}' : {e}")
        return None


def parse_wikipedia(term, data):
    try:
        title   = data.get("title", term.title())
        extract = data.get("extract", "").strip()
        page_url = data.get("content_urls", {}).get("desktop", {}).get("page", "")

        if not extract:
            return None

        # Prendre les 2 premières phrases comme définition
        sentences = extract.split(". ")
        definition = ". ".join(sentences[:2]).strip()
        if not definition.endswith("."):
            definition += "."

        return {
            "url":          page_url,
            "name":         title,
            "source":       "wikipedia",
            "definition":   definition,
            "symptoms":     [],
            "causes":       [],
            "risk_factors": [],
            "treatments":   [],
            "prevention":   []
        }

    except Exception as e:
        print(f"  ❌ Erreur parsing '{term}' : {e}")
        return None


def scrape_wikipedia():
    print("\n📖 Démarrage Wikipedia API\n")
    os.makedirs(RAW_MEDLINE_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR,   exist_ok=True)

    all_diseases = []

    for i, term in enumerate(CARDIOVASCULAR_TERMS):
        print(f"[{i+1}/{len(CARDIOVASCULAR_TERMS)}] {term}")

        data = fetch_wikipedia(term)
        if not data:
            time.sleep(DELAY_BETWEEN_REQUESTS)
            continue

        # Sauvegarder JSON brut
        raw_path = os.path.join(
            RAW_MEDLINE_DIR,
            f"{term.replace(' ', '_')}.json"
        )
        with open(raw_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        disease = parse_wikipedia(term, data)

        if disease:
            all_diseases.append(disease)
            print(f"  ✅ {disease['name']}")
        else:
            print(f"  ⚠️  Résultat vide pour '{term}'")

        time.sleep(0.5)

    output_path = os.path.join(PROCESSED_DIR, "diseases_medlineplus.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_diseases, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Terminé ! {len(all_diseases)} maladies extraites")
    print(f"📄 Fichier sauvegardé : {output_path}\n")
    return all_diseases


if __name__ == "__main__":
    scrape_wikipedia()