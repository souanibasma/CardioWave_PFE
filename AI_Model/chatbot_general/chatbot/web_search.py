import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import WEB_SEARCH_MAX_RESULTS
from dotenv import load_dotenv
load_dotenv()


def search_web(query):
    """Recherche Tavily — conçu pour les LLMs, 1000 req/mois gratuit."""
    try:
        from tavily import TavilyClient
        client  = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        results = []

        response = client.search(
            query=query + " cardiology medical 2024",
            max_results=WEB_SEARCH_MAX_RESULTS,
            search_depth="basic"
        )

        for r in response.get("results", []):
            results.append({
                "title":   r.get("title", ""),
                "url":     r.get("url", ""),
                "snippet": r.get("content", "")
            })

        return results

    except Exception as e:
        print(f"  Recherche Tavily échouée : {e}")
        return _fallback_duckduckgo(query)


def _fallback_duckduckgo(query):
    """Fallback DuckDuckGo si Tavily échoue."""
    try:
        import time
        time.sleep(5)
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(
                query + " cardiology",
                max_results=3
            ):
                results.append({
                    "title":   r.get("title", ""),
                    "url":     r.get("href", ""),
                    "snippet": r.get("body", "")
                })
        return results
    except Exception:
        return []


def format_web_results(results):
    """Formate les résultats web pour le prompt."""
    if not results:
        return "Aucun résultat web trouvé."

    parts = []
    for i, r in enumerate(results):
        parts.append(
            f"--- Résultat web {i+1} ---\n"
            f"Titre   : {r['title']}\n"
            f"URL     : {r['url']}\n"
            f"Extrait : {r['snippet']}"
        )
    return "\n\n".join(parts)


if __name__ == "__main__":
    results = search_web("nouveaux traitements fibrillation auriculaire 2024")
    print(f"Résultats trouvés : {len(results)}")
    print(format_web_results(results))