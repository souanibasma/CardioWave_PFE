from bs4 import BeautifulSoup
import os

# Lire un fichier HTML brut de StatPearls
path = "data/raw/statpearls/Myocardial_Infarction.html"

with open(path, "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "lxml")

# Voir toutes les balises h2 et h3
print("=== Titres trouvés ===")
for tag in soup.find_all(["h2", "h3"]):
    print(f"  <{tag.name}> : '{tag.get_text(strip=True)}'")