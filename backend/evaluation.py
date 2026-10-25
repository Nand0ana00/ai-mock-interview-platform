import os
import re
import requests
import json
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

FILLER_WORDS = ["um", "uh", "like", "you know", "actually", "basically", "literally", "sort of", "kind of"]

class EvaluationService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.base_url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={self.api_key}"
        )

    def analyze_speech_metrics(self, history: List[Dict[str, Any]], total_speaking_seconds: float = 60.0) -> Dict[str, Any]:
        """Calculates filler words count, speaking rate (WPM), and conciseness."""
        user_texts = [
            turn["parts"][0]["text"]
            for turn in history
            if turn.get("role") == "user" and not turn["parts"][0]["text"].startswith("[Candidate shared")
        ]
        combined_text = " ".join(user_texts).lower()

        # Word count & WPM
        words = re.findall(r'\b\w+\b', combined_text)
        word_count = len(words)
        effective_minutes = max(total_speaking_seconds / 60.0, 0.5)
        wpm = round(word_count / effective_minutes, 1)

        # Filler count
        filler_counts = {}
        total_fillers = 0
        for filler in FILLER_WORDS:
            count = len(re.findall(r'\b' + re.escape(filler) + r'\b', combined_text))
            if count > 0:
                filler_counts[filler] = count
                total_fillers += count

        # Pace assessment
        if wpm < 110:
            pace_label = "Deliberate / Slow"
        elif wpm <= 165:
            pace_label = "Optimal Conversational Pace"
        else:
            pace_label = "Rapid / Rushed"

        return {
            "total_words": word_count,
            "estimated_wpm": wpm,
            "pace_verdict": pace_label,
            "total_filler_words": total_fillers,
            "filler_breakdown": filler_counts
        }

    def generate_scorecard(
        self,
        role: str,
        history: List[Dict[str, Any]],
        speaking_time_seconds: float = 120.0,
        vision_metrics: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        speech_metrics = self.analyze_speech_metrics(history, speaking_time_seconds)
        vision_metrics = vision_metrics or {
            "eye_contact_percentage": 85,
            "slouch_percentage": 10,
            "fidget_event_count": 3,
            "composure_rating": "Strong"
        }

        # Build transcript representation
        formatted_history = []
        for turn in history:
            role_label = "Interviewer" if turn.get("role") == "model" else "Candidate"
            formatted_history.append(f"{role_label}: {turn['parts'][0]['text']}")
        transcript_str = "\n".join(formatted_history)

        prompt = f"""
You are an executive hiring bar-raiser evaluating a mock interview for the role of {role}.

Interview Transcript:
\"\"\"{transcript_str}\"\"\"

Observed Non-Verbal & Vision Metrics:
- Eye Contact: {vision_metrics.get('eye_contact_percentage')}%
- Slouch / Posture Drift: {vision_metrics.get('slouch_percentage')}%
- Nervous Fidget Count: {vision_metrics.get('fidget_event_count')}
- Overall Composure: {vision_metrics.get('composure_rating')}

Generate a thorough evaluation formatted STRICTLY as a raw JSON object (no markdown, no ```json tags).
JSON structure required:
{{
  "overall_score": 85,
  "summary_verdict": "Clear summary of candidate strengths, technical competency, and presence",
  "technical_depth": {{
    "score": 85,
    "strengths": ["string", "string"],
    "weaknesses": ["string", "string"]
  }},
  "communication_clarity": {{
    "score": 80,
    "strengths": ["string", "string"],
    "weaknesses": ["string", "string"]
  }},
  "behavioral_alignment": {{
    "score": 90,
    "star_methodology_adherence": "Detailed review of Situation, Task, Action, Result usage",
    "feedback": "string"
  }},
  "non_verbal_presence": {{
    "score": 88,
    "eye_contact_feedback": "Detailed feedback on screen gaze vs looking away",
    "body_language_feedback": "Posture and fidget composure summary"
  }},
  "actionable_tips": [
    "Tip 1", "Tip 2", "Tip 3"
  ],
  "question_evaluations": [
    {{
      "question": "Exact question asked by interviewer",
      "candidate_answer": "Summary of candidate's answer",
      "critique": "What was missing or good",
      "senior_model_answer": "A clear, compelling senior engineer-level model response."
    }}
  ]
}}
"""
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "response_mime_type": "application/json"}
        }

        res = requests.post(self.base_url, headers={"Content-Type": "application/json"}, json=payload, timeout=45)
        if res.status_code != 200:
            raise Exception(f"Gemini Scorecard API Error: {res.text}")

        res_json = res.json()
        eval_data = json.loads(res_json["candidates"][0]["content"]["parts"][0]["text"])
        eval_data["speech_metrics"] = speech_metrics
        eval_data["vision_metrics"] = vision_metrics
        return eval_data