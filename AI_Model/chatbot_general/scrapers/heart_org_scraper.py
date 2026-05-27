import requests
import json
import time
import os
import sys
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import *

# Mots-clés pour identifier chaque champ dans les titres H2
FIELD_KEYWORDS = {
    "definition": [
        "what is", "about", "overview", "introduction",
        "what are", "what happens", "understanding"
    ],
    "symptoms": [
        "symptom", "warning sign", "sign of", "feel",
        "chest pain", "presentation", "recognize"
    ],
    "causes": [
        "cause", "why", "what causes", "how does",
        "blockage", "triggered", "develops", "occur"
    ],
    "risk_factors": [
        "risk", "factor", "who is", "who get",
        "likely", "prone", "susceptible"
    ],
    "treatments": [
        "treatment", "treat", "therapy", "manage",
        "medication", "surgery", "procedure", "recover"
    ],
    "prevention": [
        "prevent", "reduce", "lower", "avoid",
        "lifestyle", "protect", "healthy"
    ]
}

# Pages à ignorer (pas des maladies)
SKIP_SECTIONS = [
    "contact us", "about us", "get involved", "our sites",
    "trending search", "watch, learn", "tools and resources",
    "you aren't alone", "quick facts", "review questions",
    "references", "related", "recent activity"
]

# Pages à filtrer (pas des maladies cardiovasculaires)
SKIP_SLUGS = [
    "salt", "sleep", "migraine", "dental", "smiles",
    "cpr", "rehab", "weight", "diet", "nutrition",
    "recipe", "cook", "exercise", "stress", "mental",
    "communicat", "como-", "controlar", "espanol",
    "professional", "caregiver", "educator", "support",
    "podcast", "video", "news", "research", "statistic"
]


def is_disease_page(url):
    slug = url.rstrip("/").split("/")[-1].lower()
    return not any(skip in slug for skip in SKIP_SLUGS)


def get_disease_urls():
    print("📥 Lecture du sitemap heart.org...")
    try:
        response = requests.get(
            HEART_ORG_SITEMAP, headers=HEADERS,
            timeout=REQUEST_TIMEOUT
        )
        root = ET.fromstring(response.content)

        urls = []
        for child in root:
            for elem in child:
                if "loc" in elem.tag:
                    url = elem.text
                    if (
                        url and
                        "/en/health-topics/" in url and
                        url.count("/") == 6 and
                        not url.endswith("/health-topics/") and
                        is_disease_page(url)
                    ):
                        urls.append(url)

        print(f"✅ {len(urls)} pages trouvées après filtrage")
        return urls[:MAX_DISEASES]

    except Exception as e:
        print(f"❌ Erreur sitemap : {e}")
        return []


def classify_section(title):
    title_lower = title.lower()
    for field, keywords in FIELD_KEYWORDS.items():
        if any(kw in title_lower for kw in keywords):
            return field
    return None


def extract_content(section):
    texts = []
    items = []

    for sibling in section.find_next_siblings():
        if sibling.name in ["h2", "h3"]:
            break
        if sibling.name == "p":
            text = sibling.get_text(separator=" ", strip=True)
            # Ignorer les textes trop courts ou navigation
            if text and len(text) > 20:
                texts.append(text)
        elif sibling.name == "ul":
            for li in sibling.find_all("li"):
                item = li.get_text(separator=" ", strip=True)
                if item and len(item) > 5:
                    items.append(item)

    return texts, items


def extract_disease_data(url, html):
    soup = BeautifulSoup(html, "lxml")

    disease = {
        "url":          url,
        "name":         "",
        "definition":   "",
        "symptoms":     [],
        "causes":       [],
        "risk_factors": [],
        "treatments":   [],
        "prevention":   []
    }

    # ── Nom depuis H1 ──
    h1 = soup.find("h1")
    if h1:
        name = h1.get_text(strip=True)
        # Nettoyer "What is a X?" → "X"
        for prefix in ["What is a ", "What is an ", "What is ", "About "]:
            if name.startswith(prefix):
                name = name[len(prefix):].rstrip("?").strip()
                break
        disease["name"] = name

    # ── Définition = premier paragraphe de la page ──
    first_p = soup.find("p")
    if first_p:
        text = first_p.get_text(separator=" ", strip=True)
        if len(text) > 30:
            disease["definition"] = text

    # ── Parser chaque section H2 ──
    sections = soup.find_all("h2")

    for section in sections:
        title = section.get_text(strip=True)

        # Ignorer les sections de navigation
        if any(skip in title.lower() for skip in SKIP_SECTIONS):
            continue

        field = classify_section(title)
        if not field:
            continue

        texts, items = extract_content(section)

        if field == "definition":
            if not disease["definition"] and texts:
                disease["definition"] = texts[0]

        elif field in ["symptoms", "causes", "risk_factors",
                       "treatments", "prevention"]:
            # Préférer les listes, sinon prendre les paragraphes
            if items:
                disease[field].extend(items)
            elif texts:
                disease[field].extend(texts[:3])

    # Dédupliquer
    for field in ["symptoms", "causes", "risk_factors",
                  "treatments", "prevention"]:
        seen = set()
        deduped = []
        for item in disease[field]:
            key = item.lower()[:50]
            if key not in seen:
                seen.add(key)
                deduped.append(item)
        disease[field] = deduped

    return disease


def save_raw_html(url, html):
    slug = url.rstrip("/").split("/")[-1]
    path = os.path.join(RAW_HEART_DIR, f"{slug}.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)


def scrape_heart_org():
    print("\n🫀 Démarrage du scraping heart.org\n")
    os.makedirs(RAW_HEART_DIR, exist_ok=True)
    os.makedirs(PROCESSED_DIR, exist_ok=True)

    urls = get_disease_urls()
    if not urls:
        print("❌ Aucune URL trouvée.")
        return []

    all_diseases = []

    for i, url in enumerate(urls):
        slug = url.rstrip("/").split("/")[-1]
        print(f"[{i+1}/{len(urls)}] {slug}")

        try:
            response = requests.get(
                url, headers=HEADERS,
                timeout=REQUEST_TIMEOUT
            )
            html = response.text
            save_raw_html(url, html)
        except Exception as e:
            print(f"  ❌ Impossible de télécharger : {e}")
            time.sleep(DELAY_BETWEEN_REQUESTS)
            continue

        data = extract_disease_data(url, html)

        if data and data["name"]:
            all_diseases.append(data)
            print(f"  ✅ {data['name']} — "
                  f"{len(data['symptoms'])} symptômes, "
                  f"{len(data['causes'])} causes, "
                  f"def: {'oui' if data['definition'] else 'non'}")
        else:
            print(f"  ⚠️  Page ignorée")

        time.sleep(DELAY_BETWEEN_REQUESTS)

    output_path = os.path.join(PROCESSED_DIR, "diseases_heart.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_diseases, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Terminé ! {len(all_diseases)} maladies extraites")
    print(f"📄 Sauvegardé : {output_path}\n")
    return all_diseases


if __name__ == "__main__":
    scrape_heart_org()