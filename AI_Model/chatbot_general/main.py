import sys
import os

def print_header():
    print("\n" + "="*55)
    print("   Chatbot Maladies Cardiovasculaires")
    print("   RAG + Gemini API")
    print("="*55)
    
def run_pipeline():
    print_header()
    print("\n⚙️  OPTIONS\n")
    print("  1 — Lancer le chatbot (données déjà prêtes)")
    print("  2 — Reconstruire toutes les données + chatbot")
    print("  3 — Reconstruire uniquement la base vectorielle")
    print("  0 — Quitter")

    choice = input("\nTon choix : ").strip()

    if choice == "0":
        print("\nAu revoir !\n")
        sys.exit(0)

    elif choice == "1":
        print("\n🚀 Lancement du chatbot...\n")
        from chatbot.app import launch_chatbot
        launch_chatbot()

    elif choice == "2":
        print("\n📥 Étape 1 — Scraping des sources...")
        from scrapers.heart_org_scraper import scrape_heart_org
        from scrapers.medlineplus_api import scrape_wikipedia
        from scrapers.statpearls_scraper import scrape_statpearls
        scrape_heart_org()
        scrape_wikipedia()
        scrape_statpearls()

        print("\n🔀 Étape 2 — Fusion et nettoyage...")
        from extraction.html_parser import parse_all
        from extraction.ner_extractor import enrich_diseases
        from extraction.data_cleaner import clean_data
        parse_all()
        enrich_diseases()
        clean_data()

        print("\n🧠 Étape 3 — Base vectorielle...")
        from database.vector_store import build_vector_store
        build_vector_store()

        print("\n🚀 Étape 4 — Lancement du chatbot...")
        from chatbot.app import launch_chatbot
        launch_chatbot()

    elif choice == "3":
        print("\n🧠 Reconstruction de la base vectorielle...")
        from database.vector_store import build_vector_store
        build_vector_store()

        print("\n🚀 Lancement du chatbot...")
        from chatbot.app import launch_chatbot
        launch_chatbot()

    else:
        print("\n❌ Choix invalide")
        run_pipeline()


if __name__ == "__main__":
    run_pipeline()