# 🚀 ECG AI Project Setup Guide

This project includes:

* 📊 ECG Digitization API
* 🧠 AI Prediction API
* 📏 Rule-Based API
* 🌐 Web Application (Frontend + Backend)

---

# 📥 1. Download Models (IMPORTANT)

Download the models from Google Drive:

https://drive.google.com/drive/folders/1kdL7GuguKKZooczQsFmzl4jIB3TrAFQ7?usp=drive_link

Then place the files exactly like this:

```
AI_Model/
│
├── models/                ← AI models (.pt)
│
├── Digitalisation/
│   ├── weights/           ← digitization models (.pth)
```

⚠️ The project will NOT work without these files.

---

# 🧪 2. Digitalization API Setup (Python venv)

## ✅ Requirements

* Python **3.10 ONLY**

Check version:

```bash
python --version
```

---

## 🔧 Create environment

```bash
cd AI_Model/Digitalisation
python -m venv env
env\Scripts\activate
```

---

## 📦 Install dependencies

Using: 

```bash
pip install -r requirements.txt
```

---

## ▶️ Run API

```bash
uvicorn api:app --port 8000
```

👉 Test:

```
http://localhost:8000/docs
```

---

# 🧠 3. AI + Rules API Setup (Conda)

## 🔧 Create environment

```bash
conda env create -f environment.yml
conda activate ecg_ai_env
```

---

## ▶️ Run AI API

```bash
cd AI_Model
python api.py
```

---

## ▶️ Run Rules API

```bash
cd AI_Model/flask_api
python app.py
```

---

# 🌐 4. Web Application Setup

## 🔧 Install dependencies

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd front
npm install
```

---

## ▶️ Run Web App

### Backend

```bash
npm run dev
```

### Frontend

```bash
npm run dev
```

---

# 🔥 Important Notes

* ⚠️ Do NOT forget to download models
* ⚠️ Use Python **3.10** for Digitalisation
* ⚠️ Use Conda environment for AI + Rules
* ⚠️ Run each service separately

---

# 🧠 Architecture Overview

```
Frontend → Node Backend → Digitalisation API → AI API → Rules API
```

---

# ✅ Final Checklist

* [ ] Models downloaded and placed correctly
* [ ] Digitalisation API running (port 8000)
* [ ] AI API running
* [ ] Rules API running
* [ ] Backend running
* [ ] Frontend running

---

# 💬 Troubleshooting

If something fails:

* Check Python version (must be 3.10 for Digitalisation)
* Check models path
* Check ports (8000 / 8001 / 5002)

---
