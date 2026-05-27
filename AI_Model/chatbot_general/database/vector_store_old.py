import json
import os
import sys
import pickle
import numpy as np
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import *

def build_text_from_disease(disease):
    """Transforme une maladie en texte complet pour l'embedding."""
    parts = []

    name = disease.get("name", "")
    if name:
        parts.append(f"Disease: {name}")

    definition = disease.get("definition", "")
    if definition:
        parts.append(f"Definition: {definition}")

    symptoms = disease.get("symptoms", [])
    if symptoms:
        parts.append(f"Symptoms: {', '.join(symptoms)}")

    causes = disease.get("causes", [])
    if causes:
        parts.append(f"Causes: {', '.join(causes)}")

    risk_factors = disease.get("risk_factors", [])
    if risk_factors:
        parts.append(f"Risk factors: {', '.join(risk_factors)}")

    treatments = disease.get("treatments", [])
    if treatments:
        parts.append(f"Treatments: {', '.join(treatments)}")

    prevention = disease.get("prevention", [])
    if prevention:
        parts.append(f"Prevention: {', '.join(prevention)}")

    return "\n".join(parts)


def build_vector_store():
    print("\n🧠 Construction de la base vectorielle\n")

    # Charger les maladies
    with open(DISEASES_JSON, "r", encoding="utf-8") as f:
        diseases = json.load(f)

    print(f"  {len(diseases)} maladies chargées")

    # Construire les textes
    texts    = []
    metadata = []

    for d in diseases:
        text = build_text_from_disease(d)
        if text.strip():
            texts.append(text)
            metadata.append({
                "name":    d.get("name", ""),
                "sources": d.get("sources", []),
                "urls":    d.get("urls", [])
            })

    print(f"  {len(texts)} textes préparés pour l'embedding")

    # Charger le modèle d'embedding
    print(f"\n  Chargement du modèle : {EMBEDDING_MODEL}")
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer(EMBEDDING_MODEL)

    # Encoder les textes
    print("  Encoding en cours...")
    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        batch_size=32
    )
    embeddings = np.array(embeddings).astype("float32")
    print(f"  ✅ Embeddings : {embeddings.shape}")

    # Créer l'index FAISS
    import faiss
    dimension = embeddings.shape[1]
    index = faiss.IndexFlatL2(dimension)
    index.add(embeddings)
    print(f"  ✅ Index FAISS créé : {index.ntotal} vecteurs")

    # Sauvegarder
    os.makedirs(VECTOR_DB_DIR, exist_ok=True)

    faiss.write_index(index, FAISS_INDEX)
    print(f"  ✅ Index sauvegardé : {FAISS_INDEX}")

    with open(FAISS_TEXTS, "wb") as f:
        pickle.dump({"texts": texts, "metadata": metadata}, f)
    print(f"  ✅ Textes sauvegardés : {FAISS_TEXTS}")

    print(f"\n✅ Base vectorielle prête — {len(texts)} maladies indexées\n")
    return index, texts, metadata


if __name__ == "__main__":
    build_vector_store()