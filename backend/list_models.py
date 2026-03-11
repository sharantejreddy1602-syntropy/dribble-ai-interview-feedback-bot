import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=API_KEY)

models = client.models.list()

print("\n==== AVAILABLE MODELS ====\n")
for m in models:
    print(m.name)
