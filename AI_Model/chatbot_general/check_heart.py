from bs4 import BeautifulSoup
import os

folder = "data/raw/heart_org"
path   = os.path.join(folder, "about-heart-attacks.html")

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "lxml")

print("=== CONTENU COMPLET PAR SECTION ===\n")
sections = soup.find_all("h2")

for section in sections:
    title = section.get_text(strip=True)
    if not title or title in ["Contact Us", "About Us", "Get Involved", "Our Sites", "Trending Search"]:
        continue

    print(f"── {title} ──")

    for sibling in section.find_next_siblings():
        if sibling.name == "h2":
            break
        if sibling.name == "p":
            text = sibling.get_text(strip=True)
            if text:
                print(f"  p: {text[:150]}")
        elif sibling.name == "ul":
            for li in sibling.find_all("li"):
                print(f"  - {li.get_text(strip=True)[:100]}")
    print()