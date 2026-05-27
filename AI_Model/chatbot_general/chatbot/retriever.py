import pickle
import numpy as np
import faiss
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import *

# Chargement au démarrage (une seule fois)
print("  Chargement de la base vectorielle...")
from sentence_transformers import SentenceTransformer

_model = SentenceTransformer(EMBEDDING_MODEL)
_index = faiss.read_index(FAISS_INDEX)

with open(FAISS_TEXTS, "rb") as f:
    _data = pickle.load(f)

_texts    = _data["texts"]
_metadata = _data["metadata"]
print(f"  ✅ {_index.ntotal} maladies chargées\n")


def retrieve(question, top_k=None):
    """Cherche les maladies les plus proches de la question."""
    if top_k is None:
        top_k = TOP_K_RESULTS

    # Encoder la question
    q_vec = _model.encode([question]).astype("float32")

    # Chercher dans FAISS
    distances, indices = _index.search(q_vec, top_k)

    results = []
    for i, idx in enumerate(indices[0]):
        if idx == -1:
            continue
        results.append({
            "text":     _texts[idx],
            "metadata": _metadata[idx],
            "score":    float(distances[0][i])
        })

    return results


def retrieve_as_context(question, top_k=None):
    results = retrieve(question, top_k)

    if not results:
        return "No relevant information found."

    context_parts = []
    for i, r in enumerate(results):
        meta = r["metadata"]
        name = meta.get("name", "Unknown")
        sources = meta.get("sources", [])
        urls = meta.get("urls", [])

        # Construire l'en-tête de source
        source_str = ", ".join(sources) if sources else "N/A"
        url_str = next(
            (u for u in urls if u and u.startswith("http")), ""
        )

        header = f"--- Source {i+1}: {name} ---"
        header += f"\nOrganisme : {source_str}"
        if url_str:
            header += f"\nURL : {url_str}"

        context_parts.append(f"{header}\n{r['text']}")

    return "\n\n".join(context_parts)

if __name__ == "__main__":
    question = "What are the symptoms of a heart attack?"
    print(f"Question : {question}\n")
    context  = retrieve_as_context(question)
    print(context[:500])