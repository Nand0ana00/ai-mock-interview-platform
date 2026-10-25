import os
import requests
from dotenv import load_dotenv

load_dotenv()
key = os.getenv("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={key}"
headers = {"Content-Type": "application/json"}
payload = {
    "contents": [{"parts": [{"text": "Hi"}]}]
}

try:
    print("Sending POST request (timeout=30s)...")
    res = requests.post(url, headers=headers, json=payload, timeout=30)
    print("Status:", res.status_code)
    print("Response:", res.text[:300])
except Exception as e:
    print("Error:", e)