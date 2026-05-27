import json
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import *


def load_json(path):
    if not os.path.exists(path):
        print(f"  ⚠️  Fichier introuvable : {path}")
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def normalize_name(name):
    return name.lower().strip()


def merge_fields(base, extra):
    seen = set(i.lower() for i in base)
    result = list(base)
    for item in extra:
        if item.lower() not in seen and item.strip():
            result.append(item)
            seen.add(item.lower())
    return result


def merge_sources(heart, medline, statpearls):
    merged = {}

    # ── heart.org comme base principale ──
    for d in heart:
        key = normalize_name(d["name"])
        merged[key] = {
            "name":         d["name"],
            "sources":      ["heart.org"],
            "urls":         [d.get("url", "")],
            "definition":   d.get("definition", ""),
            "symptoms":     d.get("symptoms", []),
            "causes":       d.get("causes", []),
            "risk_factors": d.get("risk_factors", []),
            "treatments":   d.get("treatments", []),
            "prevention":   d.get("prevention", [])
        }

    # ── Enrichir avec Wikipedia ──
    for d in medline:
        key = normalize_name(d["name"])
        if key in merged:
            if not merged[key]["definition"] and d.get("definition"):
                merged[key]["definition"] = d["definition"]
            for field in ["symptoms", "causes", "risk_factors", "treatments", "prevention"]:
                if not merged[key][field] and d.get(field):
                    merged[key][field] = d[field]
            merged[key]["sources"].append("wikipedia")
            merged[key]["urls"].append(d.get("url", ""))
        else:
            merged[key] = {
                "name":         d["name"],
                "sources":      ["wikipedia"],
                "urls":         [d.get("url", "")],
                "definition":   d.get("definition", ""),
                "symptoms":     d.get("symptoms", []),
                "causes":       d.get("causes", []),
                "risk_factors": d.get("risk_factors", []),
                "treatments":   d.get("treatments", []),
                "prevention":   d.get("prevention", [])
            }

    # ── Enrichir avec StatPearls ──
    for d in statpearls:
        key = normalize_name(d["name"])
        if key in merged:
            for field in ["symptoms", "causes", "risk_factors", "treatments", "prevention"]:
                if d.get(field):
                    merged[key][field] = merge_fields(
                        merged[key][field],
                        d[field]
                    )
            if not merged[key]["definition"] and d.get("definition"):
                merged[key]["definition"] = d["definition"]
            merged[key]["sources"].append("statpearls")
            merged[key]["urls"].append(d.get("url", ""))
        else:
            merged[key] = {
                "name":         d["name"],
                "sources":      ["statpearls"],
                "urls":         [d.get("url", "")],
                "definition":   d.get("definition", ""),
                "symptoms":     d.get("symptoms", []),
                "causes":       d.get("causes", []),
                "risk_factors": d.get("risk_factors", []),
                "treatments":   d.get("treatments", []),
                "prevention":   d.get("prevention", [])
            }

    return list(merged.values())


def parse_all():
    print("\n🔀 Fusion des sources\n")

    heart      = load_json(os.path.join(PROCESSED_DIR, "diseases_heart.json"))
    medline    = load_json(os.path.join(PROCESSED_DIR, "diseases_medlineplus.json"))
    statpearls = load_json(os.path.join(PROCESSED_DIR, "diseases_statpearls.json"))

    print(f"  heart.org  : {len(heart)} maladies")
    print(f"  wikipedia  : {len(medline)} maladies")
    print(f"  statpearls : {len(statpearls)} maladies")

    merged = merge_sources(heart, medline, statpearls)
    print(f"\n  Total fusionné : {len(merged)} maladies uniques")

    with_def      = sum(1 for d in merged if d["definition"])
    with_symptoms = sum(1 for d in merged if d["symptoms"])
    with_causes   = sum(1 for d in merged if d["causes"])

    print(f"  Avec définition : {with_def}/{len(merged)}")
    print(f"  Avec symptômes  : {with_symptoms}/{len(merged)}")
    print(f"  Avec causes     : {with_causes}/{len(merged)}")

    with open(DISEASES_JSON, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Fichier final sauvegardé : {DISEASES_JSON}\n")
    return merged


if __name__ == "__main__":
    parse_all()