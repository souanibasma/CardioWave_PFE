from dotenv import load_dotenv
import os
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

print("Modèles disponibles :\n")
for model in client.models.list():
    if "generateContent" in str(model.supported_actions):
        print(f"  {model.name}")