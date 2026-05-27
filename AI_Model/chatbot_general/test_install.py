libs = [
    ("requests",             "requests"),
    ("beautifulsoup4",       "bs4"),
    ("lxml",                 "lxml"),
    ("numpy",                "numpy"),
    ("sentence-transformers","sentence_transformers"),
    ("faiss-cpu",            "faiss"),
    ("google-genai",         "google.genai"),
    ("python-dotenv",        "dotenv"),
    ("gradio",               "gradio"),
    ("scispacy",             "scispacy"),
]

print("\n── Vérification des librairies ──\n")
all_ok = True
for name, module in libs:
    try:
        __import__(module)
        print(f"  OK  {name}")
    except ImportError:
        print(f"  MANQUANT  {name}")
        all_ok = False

print()
if all_ok:
    print("Tout est installe - tu peux continuer !")
else:
    print("Installe les librairies manquantes puis relance.")