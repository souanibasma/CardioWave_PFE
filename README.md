# 🚀 ECG AI Project Setup Guide

This project includes:
* 📊 ECG Digitization API (FastAPI)
* 🧠 AI Prediction API (FastAPI)
* 📏 Rule-Based API (Flask)
* 💬 Chatbot Médical Général (Flask)
* 🩺 Chatbot ECG & Analyse (FastAPI)
* 🌐 Web Application (Frontend + Backend)

---

# 📥 1. Download Models (IMPORTANT)

Download the models from Google Drive:
https://drive.google.com/drive/folders/1kdL7GuguKKZooczQsFmzl4jIB3TrAFQ7?usp=drive_link

Place the files exactly like this:
```text
AI_Model/
│
├── models/                ← AI models (.pt)
│
├── Digitalisation/
│   ├── weights/           ← digitization models (.pth)
```

⚠️ The project will NOT work without these files.

---

# 🚀 2. Démarrage Rapide (Commandes directes)

Voici les commandes exactes pour démarrer chaque composant dans un terminal séparé. Toutes les commandes doivent être exécutées **depuis la racine du projet**.

## 2.1 🌐 Web Frontend (Next.js - Port 3000)
```bash
cd web/front
npm install
npm run dev
```

## 2.2 ⚙️ Web Backend (Node.js - Port 4000)
```bash
cd web/backend
npm install
npm run dev
```

## 2.3 📊 Digitalisation API (Python venv - Port 8000)
*Nécessite Python 3.10*
```bash
cd AI_Model/Digitalisation
python -m venv env
env\Scripts\activate
pip install -r requirements.txt
uvicorn api:app --port 8000
```

## 2.4 🧠 AI Prediction API (Conda - Port 8001)
```bash
cd AI_Model
conda activate ecg_ai_env
python api.py
```

## 2.5 📏 Rule-Based API (Conda - Port 5002)
```bash
cd AI_Model/flask_api
conda activate ecg_regle
python app.py
```

## 2.6 💬 Chatbot Médical Général (Conda - Port 8002)
```bash
cd AI_Model/chatbot_general
conda activate chatbot_env
python api.py
```

## 2.7 🩺 Chatbot ECG & Analyse (Conda - Port 8003)
```bash
cd AI_Model/chatbot_api
conda activate ecg_ai_env
uvicorn api:app --host 0.0.0.0 --port 8003
```

---

# 🔥 Important Notes

* ⚠️ Do NOT forget to download models
* ⚠️ Use Python **3.10** for Digitalisation
* ⚠️ Run each service separately in its own terminal

---

# 🧠 Architecture Overview

```text
Frontend (3000) → Node Backend (4000) 
                     ↓
             Digitalisation API (8000) 
                     ↓
    [ AI API (8001) + Rules API (5002) ]
                     ↓
    [ Chatbot General (8002) + Chatbot ECG (8003) ]
```

---

# 💬 Troubleshooting

If something fails:
* Check Python version (must be 3.10 for Digitalisation)
* Check models path
* Check ports conflicts (8000, 8001, 8002, 8003, 5002, 3000, 4000)
* Check conda environments (`ecg_ai_env`, `ecg_regle`, `chatbot_env`)
