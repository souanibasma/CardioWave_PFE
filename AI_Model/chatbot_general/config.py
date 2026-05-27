import os

# ─── URLs des sources ───────────────────────────────────────────
HEART_ORG_SITEMAP    = "https://www.heart.org/sitemap.xml"
HEART_ORG_BASE       = "https://www.heart.org/en/health-topics"
MEDLINEPLUS_API_URL  = "https://wsearch.nlm.nih.gov/ws/query"
STATPEARLS_BASE      = "https://www.ncbi.nlm.nih.gov/books/NBK535419/"

# ─── Chemins des dossiers ───────────────────────────────────────
BASE_DIR         = os.path.dirname(os.path.abspath(__file__))
RAW_HEART_DIR    = os.path.join(BASE_DIR, "data", "raw", "heart_org")
RAW_MEDLINE_DIR  = os.path.join(BASE_DIR, "data", "raw", "medlineplus")
RAW_STATPEARLS_DIR = os.path.join(BASE_DIR, "data", "raw", "statpearls")
PROCESSED_DIR    = os.path.join(BASE_DIR, "data", "processed")
VECTOR_DB_DIR    = os.path.join(BASE_DIR, "data", "vector_db")

# ─── Fichiers de sortie ─────────────────────────────────────────
DISEASES_JSON    = os.path.join(PROCESSED_DIR, "diseases.json")
FAISS_INDEX      = os.path.join(VECTOR_DB_DIR, "index.faiss")
FAISS_TEXTS      = os.path.join(VECTOR_DB_DIR, "texts.pkl")

# ─── Paramètres scraping ────────────────────────────────────────
DELAY_BETWEEN_REQUESTS = 1      # secondes entre chaque requête
MAX_DISEASES           = 150    # nombre max de maladies à collecter
REQUEST_TIMEOUT        = 15     # secondes avant abandon

# ─── Paramètres RAG ─────────────────────────────────────────────
EMBEDDING_MODEL  = "all-MiniLM-L6-v2"   # modèle d'embedding léger
TOP_K_RESULTS    = 3                      # nombre de résultats FAISS
GEMINI_MODEL = "gemini-2.5-flash"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


# ─── OpenRouter / Elephant ───────────────────────────────────────
OPENROUTER_API_URL   = "https://openrouter.ai/api/v1"
ELEPHANT_MODEL = "mistralai/mistral-7b-instruct:free"
# ─── Seuil de confiance RAG ──────────────────────────────────────
# Si le score FAISS est supérieur à ce seuil → recherche web
RAG_SCORE_THRESHOLD  = 1.8

# ─── Recherche web ───────────────────────────────────────────────
WEB_SEARCH_MAX_RESULTS = 5
