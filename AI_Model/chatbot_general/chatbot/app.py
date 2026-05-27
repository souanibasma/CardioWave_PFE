import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from chatbot.llm_chain import ask

WARNING = """
╔══════════════════════════════════════════════════════╗
║           AVERTISSEMENT MÉDICAL IMPORTANT            ║
║                                                      ║
║  Cet outil est une AIDE À LA DÉCISION uniquement.   ║
║  Il ne remplace pas le jugement clinique.            ║
║  Basez-vous toujours sur les guidelines officielles. ║
║  Consultez les sources originales pour confirmation. ║
╚══════════════════════════════════════════════════════╝
"""

def print_header():
    print("\n" + "="*55)
    print("   Assistant Cardiologie — Aide à la Décision")
    print("   Elephant (OpenRouter) + Gemini | RAG + Web")
    print("="*55)
    print(WARNING)
    print("  Commandes disponibles :")
    print("  'quitter'    — Fermer l'application")
    print("  'sources'    — Voir les sources")
    print("  'effacer'    — Vider l'écran")
    print("  'historique' — Dernières questions")
    print()
    print("  Astuce : pour une recherche web, mentionnez")
    print("  'récent', 'nouveau', '2024' dans votre question")
    print("="*55 + "\n")


def show_sources():
    print("""
  Sources de données utilisées :
  ─────────────────────────────
  • American Heart Association (heart.org)
  • Wikipedia Medical
  • StatPearls — NCBI Bookshelf

  Pour les guidelines officielles :
  • ESC  : https://www.escardio.org/guidelines
  • AHA  : https://professional.heart.org/guidelines
""")


def launch_chatbot():
    print_header()
    history = []

    while True:
        try:
            question = input("Cardiologue : ").strip()

            if not question:
                continue

            if question.lower() in ["quitter", "quit", "exit"]:
                print("\nSession terminée. Bonne pratique !\n")
                break

            if question.lower() == "sources":
                show_sources()
                continue

            if question.lower() == "effacer":
                os.system("cls" if os.name == "nt" else "clear")
                print_header()
                continue

            if question.lower() == "historique":
                if not history:
                    print("\n  Aucune question posée.\n")
                else:
                    print("\n  Historique des questions :")
                    for i, h in enumerate(history[-5:], 1):
                        print(f"  {i}. {h['question']}")
                    print()
                continue

            print("\n  Recherche et analyse en cours...\n")
            answer = ask(question, history=history)

            print(f"Assistant :\n{answer}\n")
            print("─" * 55)
            print("  ⚠️  Aide à la décision — Vérifier avec guidelines")
            print("─" * 55 + "\n")

            history.append({
                "question": question,
                "answer":   answer
            })

        except KeyboardInterrupt:
            print("\n\nSession interrompue.\n")
            break
        except Exception as e:
            print(f"\n❌ Erreur : {e}\n")


if __name__ == "__main__":
    launch_chatbot()