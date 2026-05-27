import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
#from config import *
from config import *
#from chatbot.retriever import retrieve_as_context
from retriever import retrieve_as_context
from dotenv import load_dotenv

load_dotenv()
import google.generativeai as genai
#from google import genai
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

SYSTEM_PROMPT = """Tu es un assistant médical spécialisé dans les maladies cardiovasculaires.
Tu aides les cardiologues et professionnels de santé à trouver rapidement des informations médicales fiables.

RÈGLES IMPORTANTES :
- Réponds UNIQUEMENT en français
- Base-toi UNIQUEMENT sur le contexte médical fourni
- Si l'information n'est pas dans le contexte, dis-le clairement
- Ne pose jamais de diagnostic médical définitif
- Indique toujours les sources utilisées
- Utilise un langage médical professionnel
- Structure toujours ta réponse clairement"""

CORRECTION_PROMPT = """Tu es un expert cardiologue chargé de relire et corriger des réponses générées par un assistant IA.

Ta mission est de corriger la réponse ci-dessous pour qu'elle soit médicalement exacte, complète et bien structurée.

Instructions :
1. Corrige toute erreur médicale.
2. Distingue clairement :
   - Les causes (conditions médicales directes)
   - Les facteurs de risque (mode de vie ou éléments contributifs)
3. Ajoute les informations importantes manquantes.
4. Si des mesures de prévention existent, tu DOIS les inclure.
5. Pour chaque traitement ou recommandation mentionné, indique si possible :
   - Classe ESC/AHA (I, II, III)
   - Niveau de preuve (A, B, C)
6. Structure la réponse avec ces sections (si pertinent) :
   - **Définition**
   - **Causes**
   - **Facteurs de risque**
   - **Symptômes**
   - **Traitement**
   - **Prévention**
7. À la fin de la réponse, ajoute TOUJOURS ces deux sections :

**Sources utilisées :**
- [liste des sources mentionnées dans le contexte]

**Niveau de confiance :**
- ÉLEVÉ : information bien documentée dans les sources
- MOYEN : information partielle
- FAIBLE : information insuffisante dans la base

8. Sois concis mais médicalement complet.
9. Ne mentionne pas que tu corriges ou analyses la réponse.
10. Utilise un langage médical professionnel et clair.
11. N'inclus pas de numéros d'urgence spécifiques à un pays.

Réponse à corriger :
{response}

Sources disponibles dans le contexte :
{sources}

Réponse corrigée :"""


def ask_raw(question, history=None):
    """Première passe — génère une réponse depuis le contexte RAG."""
    context = retrieve_as_context(question)

    history_text = ""
    if history:
        history_text = "HISTORIQUE DE LA CONVERSATION :\n"
        for h in history[-3:]:
            history_text += f"Question: {h['question']}\n"
            history_text += f"Réponse: {h['answer'][:200]}...\n\n"

    prompt = f"""{SYSTEM_PROMPT}

{history_text}
CONTEXTE MÉDICAL :
{context}

QUESTION :
{question}

RÉPONSE :"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt
    )
    return response.text, context


def ask_corrected(raw_response, context):
    # Extraire les sources depuis le contexte
    sources = []
    for line in context.split("\n"):
        if line.startswith("--- Source"):
            sources.append(line.replace("---", "").strip())
        elif line.startswith("Organisme :"):
            sources.append(line.strip())
        elif line.startswith("URL :"):
            sources.append(line.strip())

    sources_text = "\n".join(sources) if sources else "heart.org, StatPearls, Wikipedia"

    prompt = CORRECTION_PROMPT.format(
        response=raw_response,
        sources=sources_text
    )

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt
    )
    return response.text


def ask(question, history=None, correct=True):
    """
    Pipeline complet :
    1. Récupère le contexte RAG
    2. Génère une réponse initiale
    3. Corrige et enrichit la réponse
    """
    raw, context = ask_raw(question, history)

    if correct:
        return ask_corrected(raw, context)
    return raw


if __name__ == "__main__":
    question = "Quels sont les symptômes d'un infarctus ?"
    print(f"Question : {question}\n")
    raw, context = ask_raw(question)
    print("--- Réponse brute ---")
    print(raw)
    print("\n--- Réponse corrigée ---")
    corrected = ask_corrected(raw, context)
    print(corrected)