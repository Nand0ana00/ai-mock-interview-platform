import os
import requests
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"

res = requests.get(url, timeout=10)
if res.status_code == 200:
    models = res.json().get("models", [])
    print("Available models supporting generateContent:\n")
    for m in models:
        methods = m.get("supportedGenerationMethods", [])
        if "generateContent" in methods:
            # prints just the clean model identifier
            print(m["name"].replace("models/", ""))
else:
    print(f"Error {res.status_code}: {res.text}")