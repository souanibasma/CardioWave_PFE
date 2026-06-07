import os
import time
import requests
import statistics
import glob

# Configuration des URLs de tes APIs
DIGITIZATION_API = "http://localhost:8000/digitize"
AI_CLASSIFICATION_API = "http://localhost:8001/predict"
DETERMINISTIC_API = "http://localhost:5002/api/ecg/analyze"

# Dossier contenant tes images ECG pour le test
TEST_FOLDER = r"H:\Mediwave_Stage\Project\ECG_classification_models\web\backend\uploads\ecgs"

def run_benchmark():
    print("="*60)
    print("🚀 DÉMARRAGE DU BENCHMARK DE PERFORMANCE IA")
    print("="*60)

    image_paths = glob.glob(os.path.join(TEST_FOLDER, "*.png")) + glob.glob(os.path.join(TEST_FOLDER, "*.jpg"))
    if not image_paths:
        print(f"❌ Aucune image trouvée dans {TEST_FOLDER}.")
        return

    print(f"📁 {len(image_paths)} images trouvées. Début des tests...\n")

    digitization_times = []
    deep_learning_times = []
    flask_rules_times = []

    for idx, img_path in enumerate(image_paths, 1):
        filename = os.path.basename(img_path)
        print(f"[{idx}/{len(image_paths)}] Test sur l'image: {filename}")

        # ---------------------------------------------------------
        # 1. TEST DE LA DIGITALISATION
        # ---------------------------------------------------------
        try:
            with open(img_path, 'rb') as f:
                start_dig = time.time()
                res_dig = requests.post(DIGITIZATION_API, files={'file': f})
                end_dig = time.time()
            
            if res_dig.status_code != 200:
                print(f"   ⚠️ Erreur Digitalisation ({res_dig.status_code})")
                continue
            
            dig_time = end_dig - start_dig
            digitization_times.append(dig_time)
            print(f"   ⏱️ Digitalisation: {dig_time:.2f} s")

            data = res_dig.json()
            npy_filename = f"{os.path.splitext(filename)[0]}_extracted_12leads.npy"
            npy_local_path = os.path.join(r"H:\Mediwave_Stage\Project\ECG_classification_models\AI_Model\Digitalisation\output_prod\digitalised", npy_filename)

            if not os.path.exists(npy_local_path):
                continue

        except Exception as e:
            continue

        # ---------------------------------------------------------
        # 2. TEST DE L'ANALYSE (DEEP LEARNING vs FLASK)
        # ---------------------------------------------------------
        try:
            # Appel API Deep Learning (Port 8001)
            start_dl = time.time()
            with open(npy_local_path, 'rb') as f_npy:
                res_ai = requests.post(AI_CLASSIFICATION_API, files={'file': f_npy})
            end_dl = time.time()
            
            if res_ai.status_code == 200:
                dl_time = end_dl - start_dl
                deep_learning_times.append(dl_time)
                print(f"   ⏱️ Deep Learning IA: {dl_time:.2f} s")

            # Appel API Déterministe Flask (Port 5002)
            start_flask = time.time()
            with open(npy_local_path, 'rb') as f_npy2:
                res_flask = requests.post(DETERMINISTIC_API, files={'file': f_npy2})
            end_flask = time.time()
            
            if res_flask.status_code == 200:
                flask_time = end_flask - start_flask
                flask_rules_times.append(flask_time)
                print(f"   ⏱️ Traitement Flask: {flask_time:.2f} s")

        except Exception as e:
            pass

    # ---------------------------------------------------------
    # RÉSULTATS STATISTIQUES FINAUX
    # ---------------------------------------------------------
    print("\n" + "="*60)
    print("📊 RÉSULTATS DU BENCHMARK (pour le rapport de PFE)")
    print("="*60)
    
    if digitization_times:
        print(f"--- 1. DIGITALISATION (Extraction Visuelle sur GPU) ---")
        print(f"  Temps Moyen : {statistics.mean(digitization_times):.2f} s")
        print(f"  Temps Min   : {min(digitization_times):.2f} s")
        print(f"  Temps Max   : {max(digitization_times):.2f} s")
    
    if deep_learning_times:
        print(f"\n--- 2. CLASSIFICATION IA (Deep Learning sur GPU) ---")
        print(f"  Temps Moyen : {statistics.mean(deep_learning_times):.2f} s")
        print(f"  Temps Min   : {min(deep_learning_times):.2f} s")
        print(f"  Temps Max   : {max(deep_learning_times):.2f} s")

    if flask_rules_times:
        print(f"\n--- 3. RÈGLES DÉTERMINISTES (NeuroKit2 sur CPU) ---")
        print(f"  Temps Moyen : {statistics.mean(flask_rules_times):.2f} s")
        print(f"  Temps Min   : {min(flask_rules_times):.2f} s")
        print(f"  Temps Max   : {max(flask_rules_times):.2f} s")
    
    print("="*60)

if __name__ == "__main__":
    run_benchmark()
