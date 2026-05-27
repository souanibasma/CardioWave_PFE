import os
import sys
import json
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, Response
from flask_cors import CORS
from chatbot.llm_chain import ask
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)


@app.route("/health", methods=["GET"])
def health():
    return Response(
        json.dumps({"status": "ok", "service": "cardiovascular-chatbot", "version": "2.0"}, ensure_ascii=False),
        status=200,
        mimetype='application/json'
    )


@app.route("/chat", methods=["POST"])
def chat():
    data     = request.get_json()
    question = data.get("question", "").strip()
    history  = data.get("history", [])

    if not question:
        return Response(
            json.dumps({"error": "Question vide"}, ensure_ascii=False),
            status=400,
            mimetype='application/json'
        )

    if len(question) > 1000:
        return Response(
            json.dumps({"error": "Question trop longue"}, ensure_ascii=False),
            status=400,
            mimetype='application/json'
        )

    try:
        result = ask(question, history=history)
        answer = result.get("answer")
        sources = result.get("sources", [])

        if not answer:
            answer = "Je n'ai pas pu générer une réponse. Veuillez réessayer."

        return Response(
            json.dumps({
                "answer":   answer,
                "sources":  sources,
                "question": question,
                "model":    "elephant",
                "status":   "success"
            }, ensure_ascii=False),
            status=200,
            mimetype='application/json'
        )

    except Exception as e:
        print(f"Erreur : {e}")
        return Response(
            json.dumps({
                "error":  "Service indisponible",
                "detail": str(e)
            }, ensure_ascii=False),
            status=500,
            mimetype='application/json'
        )


if __name__ == "__main__":
    print("\n🫀 API Cardiovascular Chatbot")
    print("   Port : 8002")
    print("   Endpoints :")
    print("   GET  /health")
    print("   POST /chat\n")
    app.run(host="0.0.0.0", port=8002)