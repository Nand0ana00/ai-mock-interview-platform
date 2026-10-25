import os
import requests
import json
import re
from typing import Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

PERSONA_PROMPTS = {
    "mentor": "Demeanor: Warm, encouraging, supportive mentor. If the candidate hesitates or is slightly off, offer a subtle guiding nudge before drilling deeper.",
    "faang_lead": "Demeanor: Strict, uncompromising FAANG Staff/Principal Engineer. Ruthlessly probe scalability limits, time/space complexity, edge cases, single points of failure, and trade-offs. Challenge vague answers.",
    "startup_founder": "Demeanor: Fast-paced, pragmatic startup founder/CTO. Prioritize speed-to-market, architectural pragmatism, technical debt management, bias for action, and full-stack ownership over theoretical perfection."
}

COMPANY_PROMPTS = {
    "google": "Target Company Style: Google (Focus deeply on algorithms, data structures, large-scale distributed systems, and rigorous mathematical/computational correctness).",
    "amazon": "Target Company Style: Amazon (Heavily test Amazon Leadership Principles—Customer Obsession, Ownership, Bias for Action, Dive Deep, and Have Backbone; Disagree and Commit).",
    "atlassian": "Target Company Style: Atlassian (Assess cross-functional empathy, open collaboration, agile delivery, clean code maintainability, and team conflict resolution).",
    "startup": "Target Company Style: High-Growth YC Startup (Assess high velocity, MVPs, resilience under high ambiguity, and practical end-to-end product delivery)."
}

class InterviewSession:
    def __init__(self, role: str, experience_level: str, persona: str = "mentor", company_style: str = "google"):
        self.role = role
        self.experience_level = experience_level
        self.persona = persona
        self.company_style = company_style
        self.resume_text = ""
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is missing.")

        self.base_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={self.api_key}"
        )
        self.history: List[Dict[str, Any]] = []

    def _get_system_instruction(self) -> str:
        persona_guide = PERSONA_PROMPTS.get(self.persona, PERSONA_PROMPTS["faang_lead"])
        company_guide = COMPANY_PROMPTS.get(self.company_style, COMPANY_PROMPTS["google"])

        return f"""
You are conducting a multi-stage technical interview for a {self.role} ({self.experience_level}) role.

{persona_guide}
{company_guide}

Candidate Resume & Technical Background:
\"\"\"{self.resume_text if self.resume_text else "General computer science and software development background."}\"\"\"

Interview Pipeline:
1. Warm-up & Self-Introduction: Candidate must introduce themselves and project experiences.
2. HR / Culture Fit: Assess culture fit, handling stress, teamwork according to {self.company_style} culture.
3. Managerial / Situational: Test priority management, trade-offs, and technical conflict.
4. Technical Deep Dive: Challenge concrete projects, frameworks, databases, and trade-offs directly from their resume.

Core Rules:
- ONE question at a time. Never give bulleted lists or multi-part questions.
- VERIFY: If the candidate gives an evasive, incomplete ("hi I am fine"), or minimal answer, gently insist they answer the original question before moving on.
- Spoken Voice: Keep replies conversational, sharp, and strictly within 2 to 3 sentences so TTS reads it cleanly.
"""

    def _call_gemini(self, contents: list, temp: float = 0.6) -> str:
        payload = {
            "system_instruction": {
                "parts": [{"text": self._get_system_instruction()}]
            },
            "contents": contents,
            "generationConfig": {
                "temperature": temp,
                "maxOutputTokens": 250
            }
        }
        res = requests.post(self.base_url, headers={"Content-Type": "application/json"}, json=payload, timeout=30)
        if res.status_code != 200:
            raise Exception(f"Gemini API Error {res.status_code}: {res.text}")
        data = res.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    def start_interview(self, resume_content: str = "") -> str:
        self.resume_text = resume_content
        self.history = []

        prompt = [{
            "role": "user",
            "parts": [{
                "text": f"Begin the interview in your persona ({self.persona}). Greet me warmly or professionally according to your persona, and ask me to briefly introduce myself and my background."
            }]
        }]
        greeting = self._call_gemini(prompt)
        self.history.append({"role": "model", "parts": [{"text": greeting}]})
        return greeting

    def respond(self, candidate_transcript: str) -> str:
        self.history.append({"role": "user", "parts": [{"text": candidate_transcript}]})
        reply = self._call_gemini(self.history)
        self.history.append({"role": "model", "parts": [{"text": reply}]})
        return reply