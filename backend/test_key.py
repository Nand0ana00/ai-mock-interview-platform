import os
import socket
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Force standard socket connections to prefer IPv4 on Linux
orig_getaddrinfo = socket.getaddrinfo

def getaddrinfo_ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
    return orig_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)

socket.getaddrinfo = getaddrinfo_ipv4_only

key = os.getenv("GEMINI_API_KEY")
print(f"Loaded key starting with: {key[:6] if key else 'None'}")

try:
    print("Connecting to Gemini API over IPv4...")
    client = genai.Client(
        api_key=key,
        http_options=types.HttpOptions(timeout=10.0)  # 10s timeout instead of infinite hang
    )
    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents="Say hi in three words.",
    )
    print("Success! Response:", response.text)
except Exception as e:
    print("Error encountered:", type(e).__name__, e)