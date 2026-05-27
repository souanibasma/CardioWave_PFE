import requests
import json
import time
import os
import sys
import warnings
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import *

STATPEARLS_PAGES = [
    ("Myocardial Infarction",      "https://www.ncbi.nlm.nih.gov/books/NBK537076/"),
    ("Heart Failure",              "https://www.ncbi.nlm.nih.gov/books/NBK430873/"),
    ("Hypertension",               "https://www.ncbi.nlm.nih.gov/books/NBK539859/"),
    ("Atrial Fibrillation",        "https://www.ncbi.nlm.nih.gov/books/NBK526072/"),
    ("Coronary Artery Disease",    "https://www.ncbi.nlm.nih.gov/books/NBK537326/"),
    ("Stroke",                     "https://www.ncbi.nlm.nih.gov/books/NBK535369/"),
    ("Cardiac Arrest",             "https://www.ncbi.nlm.nih.gov/books/NBK534866/"),
    ("Deep Vein Thrombosis",       "https://www.ncbi.nlm.nih.gov/books/NBK507708/"),
    ("Pulmonary Embolism",         "https://www.ncbi.nlm.nih.gov/books/NBK560551/"),
    ("Endocarditis",               "https://www.ncbi.nlm.nih.gov/books/NBK542257/"),
    ("Cardiomyopathy",             "https://www.ncbi.nlm.nih.gov/books/NBK537076/"),
    ("Aortic Stenosis",            "https://www.ncbi.nlm.nih.gov/books/NBK482433/"),
    ("Atherosclerosis",            "https://www.ncbi.nlm.nih.gov/books/NBK507799/"),
    ("Pericarditis",               "https://www.ncbi.nlm.nih.gov/books/NBK431080/"),
    ("Bradycardia",                "https://www.ncbi.nlm.nih.gov/books/NBK493201/"),
    ("Tachycardia",                "https://www.ncbi.nlm.nih.gov/books/NBK549803/"),
    ("Angina",                     "https://www.ncbi.nlm.nih.gov/books/NBK562310/"),
    ("Peripheral Artery Disease",  "https://www.ncbi.nlm.nih.gov/books/NBK557482/"),
    ("Ventricular Fibrillation",   "https://www.ncbi.nlm.nih.gov/books/NBK537129/"),
    ("Myocarditis",                "https://www.ncbi.nlm.nih.gov/books/NBK459259/"),
]
SECTION_KEYWORDS = {
    "definition":   ["introduction"],
    "causes":       ["etiology"],
    "risk_factors": ["epidemiology"],
    "symptoms":     ["history and physical", "history & physical"],
    "treatments":   ["treatment", "management"],
    "prevention":   ["prognosis", "complications"]
}

def fetch_page(url):
    try:
        response = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            return response.text
        else:
            print(f"  ⚠️  Status {response.status_code}")
            return None
    except Exception as e:
        print(f"  ❌ Erreur : {e}")
        return None


def parse_statpearls(name, url, html):
    soup = BeautifulSoup(html, "lxml")

    disease = {
        "url":          url,
        "name":         name,
        "source":       "statpearls",
        "definition":   "",
        "symptoms":     [],
        "causes":       [],
        "risk_factors": [],
        "treatments":   [],
        "prevention":   []
    }

    sections = soup.find_all("h2")

    for section in sections:
        section_title = section.get_text(strip=True).lower()
        content_texts = []
        content_lists = []

        for sibling in section.find_next_siblings():
            if sibling.name == "h2":
                break
            if sibling.name == "p":
                text = sibling.get_text(strip=True)
                if text:
                    content_texts.append(text)
            elif sibling.name == "ul":
                items = [
                    li.get_text(strip=True)
                    for li in sibling.find_all("li")
                    if li.get_text(strip=True)
                ]
                content_lists.extend(items)

        for field, keywords in SECTION_KEYWORDS.items():
            if any(kw in section_title for kw in keywords):
                if field == "definition":
                    disease["definition"] = " ".join(content_texts[:2])
                else:
                    if content_lists:
                        disease[field] = content_lists
                    elif content_texts:
                        disease[field] = content_texts[:3]
                break

    return disease


def scrape_statpearls():
    print("\n📚 Démarrage StatPearls NCBI\n")
    os.makedirs(RAW_STATPEARLS_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR,      exist_ok=True)

    all_diseases = []

    for i, (name, url) in enumerate(STATPEARLS_PAGES):
        print(f"[{i+1}/{len(STATPEARLS_PAGES)}] {name}")

        html = fetch_page(url)
        if not html:
            time.sleep(DELAY_BETWEEN_REQUESTS)
            continue

        # Sauvegarder HTML brut
        raw_path = os.path.join(
            RAW_STATPEARLS_DIR,
            f"{name.replace(' ', '_')}.html"
        )
        with open(raw_path, "w", encoding="utf-8") as f:
            f.write(html)

        # Parser — url passée directement
        disease = parse_statpearls(name, url, html)

        all_diseases.append(disease)
        print(f"  ✅ {disease['name']} — "
              f"{len(disease['symptoms'])} symptômes, "
              f"{len(disease['causes'])} causes")

        time.sleep(DELAY_BETWEEN_REQUESTS)

    output_path = os.path.join(PROCESSED_DIR, "diseases_statpearls.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_diseases, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Terminé ! {len(all_diseases)} maladies extraites")
    print(f"📄 Fichier sauvegardé : {output_path}\n")
    return all_diseases


if __name__ == "__main__":
    scrape_statpearls()