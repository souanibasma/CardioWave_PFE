import os
import sys
import time
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import *
from chatbot.retriever import retrieve_as_context, retrieve
from chatbot.web_search import search_web, format_web_results
from dotenv import load_dotenv

load_dotenv()

# ─── Clients ─────────────────────────────────────────────────────
from groq import Groq
import google.generativeai as genai
from openai import OpenAI

groq_client    = Groq(api_key=os.getenv("GROQ_API_KEY"))
genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)
openrouter_client = OpenAI(
    base_url=OPENROUTER_API_URL,
    api_key=os.getenv("OPENROUTER_API_KEY")
)

# ─── Intent labels ───────────────────────────────────────────────
INTENT_LABELS = {
    "symptomes":  "les symptômes uniquement",
    "causes":     "les causes uniquement",
    "traitement": "les traitements uniquement",
    "prevention": "la prévention uniquement",
    "definition": "la définition uniquement",
    "risques":    "les facteurs de risque uniquement",
    "diagnostic": "le diagnostic uniquement",
    "general":    "un résumé général court"
}


def detect_intent(question):
    q = question.lower()
    if any(k in q for k in ["symptôme", "signe", "manifeste", "ressent", "symptom", "sign", "présente"]):
        return "symptomes"
    elif any(k in q for k in ["cause", "pourquoi", "origine", "provoque", "déclenche", "etiology"]):
        return "causes"
    elif any(k in q for k in ["traitement", "traiter", "médicament", "thérapie", "soigner", "treatment"]):
        return "traitement"
    elif any(k in q for k in ["prévenir", "prévention", "éviter", "réduire", "prevent"]):
        return "prevention"
    elif any(k in q for k in ["définition", "qu'est-ce", "c'est quoi", "what is", "définir"]):
        return "definition"
    elif any(k in q for k in ["facteur de risque", "risque", "risk factor"]):
        return "risques"
    elif any(k in q for k in ["diagnostic", "diagnostiquer", "détecter", "dépister", "diagnosis"]):
        return "diagnostic"
    else:
        return "general"


"""def call_llm(prompt):
    # ── 1. Groq — rapide et fiable ──
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            timeout=30
        )
        content = response.choices[0].message.content
        if content:
            print("  Modèle : Groq llama-3.3-70b")
            return content
    except Exception as e:
        print(f"  Groq indisponible : {e}")

    # ── 2. Gemini fallback ──
    for gmodel in [
    "gemini-1.5-flash",
    "gemini-1.5-pro"
]:
    try:

        model = genai.GenerativeModel(gmodel)

        response = model.generate_content(prompt)

        if response.text:
            print(f"  Modèle : {gmodel}")
            return response.text

    except Exception as e:

        print(f"  {gmodel} indisponible : {e}")
        continue

    # ── 3. OpenRouter fallback ──
    for model in [
        "qwen/qwen3-14b:free",
        "mistralai/mistral-7b-instruct:free",
        "google/gemma-3-12b-it:free",
        "inclusionai/ling-2.6-flash:free",
    ]:
        try:
            response = openrouter_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                timeout=25
            )
            content = response.choices[0].message.content
            if content:
                print(f"  Modèle : {model}")
                return content
        except Exception:
            print(f"  {model} indisponible, essai suivant...")
            continue

    raise Exception("Tous les modèles indisponibles.")
"""
def call_llm(prompt):
    print("  Appel call_llm...")
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            timeout=30
        )
        content = response.choices[0].message.content
        print(f"  Groq response: {content[:50] if content else 'VIDE'}")
        if content:
            print("  Modèle : Groq llama-3.3-70b")
            return content
    except Exception as e:
        print(f"  Groq erreur : {e}")
        
def needs_web_search(question, rag_results):
    recent_keywords = [
        "récent", "nouveau", "dernière étude", "2024", "2025","2026"
        "actualité", "recherche web", "dernières données", "new"
    ]
    if any(kw in question.lower() for kw in recent_keywords):
        return True
    if rag_results:
        score = rag_results[0]["score"]
        print(f"  Score FAISS : {score:.3f} (seuil: {RAG_SCORE_THRESHOLD})")
        if score > RAG_SCORE_THRESHOLD:
            return True
    return False


def ask(question, history=None, correct=True):
    rag_results = retrieve(question)
    use_web     = needs_web_search(question, rag_results)
    
    sources_list = []

    if use_web:
        print("  Recherche web en cours...")
        web_results = search_web(question)
        web_context = format_web_results(web_results)
        rag_context = retrieve_as_context(question)
        context     = f"RÉSULTATS WEB :\n{web_context}\n\nCONTEXTE LOCAL :\n{rag_context}"
        
        # Extraire les sources Web
        for r in web_results:
            if r.get("url") and r["url"].startswith("http"):
                sources_list.append({"name": r.get("title", "Source Web"), "url": r["url"]})
    else:
        context = retrieve_as_context(question)
        
    # Extraire les sources RAG
    if rag_results:
        for r in rag_results:
            meta = r.get("metadata", {})
            urls = meta.get("urls", [])
            valid_url = next((u for u in urls if u and u.startswith("http")), None)
            if valid_url:
                sources_list.append({"name": meta.get("name", "Document Médical"), "url": valid_url})
                
    # Dédoublonner les sources par URL
    unique_sources = []
    seen_urls = set()
    for s in sources_list:
        if s["url"] not in seen_urls:
            unique_sources.append(s)
            seen_urls.add(s["url"])

    history_text = ""
    if history:
        history_text = "HISTORIQUE :\n"
        for h in history[-2:]:
            history_text += f"Q: {h['question']}\nR: {h['answer'][:100]}...\n\n"

    intent       = detect_intent(question)
    intent_label = INTENT_LABELS.get(intent, "un résumé court")

    prompt = f"""Tu es un assistant médical expert en cardiologie intégré dans une application médicale professionnelle.

COMPORTEMENT :
- Si c'est une salutation ou message simple → réponds naturellement et brièvement en 1 phrase
- Si la question contient UNIQUEMENT une abréviation (ex: "c'est quoi SB?", "définition FA") →
  liste TOUTES les significations possibles en cardiologie avec une courte définition pour chacune
- Si la question demande "c'est quoi X?" ou "définition X?" où X est une abréviation courte (2-4 lettres) →

  TOUJOURS lister TOUTES les significations possibles en cardiologie sous ce format :

  "X peut signifier plusieurs choses en cardiologie :"

  • Signification 1 — définition courte

  • Signification 2 — définition courte

  • Signification 3 — définition courte

  Puis demander : "Dans quel contexte utilisez-vous cette abréviation ?"
- Si c'est une question médicale complète → réponds avec le contexte fourni

RÈGLES POUR LES QUESTIONS MÉDICALES :
- Réponds UNIQUEMENT en français
- Réponds UNIQUEMENT sur : {intent_label}
- Maximum 150 mots
- Commence directement par la réponse sans introduction
- Format : 1 phrase d'accroche + liste 3-6 points essentiels + note clinique
- Ajoute les grades ESC/AHA si pertinent (ex: Classe I, Niveau A)
- Ne mentionne JAMAIS un médicament dont tu n'es pas certain à 100%
- N'INCLUS SURTOUT PAS de section "Sources :" à la fin de ta réponse. Les sources sont gérées automatiquement par le système.
- Indique simplement à la toute fin sur une nouvelle ligne: Niveau de confiance : ÉLEVÉ / MOYEN / FAIBLE

{history_text}
CONTEXTE MÉDICAL :
{context}

QUESTION : {question}

RÉPONSE :"""

    print(f"  Mode : {'Web' if use_web else 'RAG'}")
    print(f"  Intention : {intent}")

    answer = call_llm(prompt)
    return {"answer": answer, "sources": unique_sources}

if __name__ == "__main__":
    questions = [
        "salut",
        "Quels sont les symptômes d'un infarctus ?",
        "Nouveaux traitements FA 2024 ?"
    ]
    for q in questions:
        print(f"\nQuestion : {q}")
        print("-" * 40)
        print(ask(q))