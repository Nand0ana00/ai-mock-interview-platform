import os
import json
import logging
import io
import sys
import tempfile
import subprocess
from typing import Optional, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from pypdf import PdfReader

# ReportLab imports for downloadable PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from interview_agent import InterviewSession
from evaluation import EvaluationService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mock_interview_api")

app = FastAPI(title="AI Mock Interview Assistant API")

# Allow Vite frontend (port 5173 / 5174) to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

evaluator = EvaluationService()

# In-memory storage for completed session transcripts to enable post-interview scorecard retrieval
session_store: Dict[str, Dict[str, Any]] = {}


class EvaluationRequest(BaseModel):
    session_id: str
    role: str
    speaking_time_seconds: Optional[float] = 120.0
    vision_metrics: Optional[Dict[str, Any]] = None


class CodeExecutionRequest(BaseModel):
    code: str
    language: str = "python"
    test_cases: Optional[str] = ""


class PDFExportRequest(BaseModel):
    session_id: str
    role: str
    scorecard: Dict[str, Any]


@app.get("/")
def health_check():
    return {"status": "ok", "service": "AI Mock Interviewer Backend"}


# ---------------------------------------------------------------------------
# Resume Upload & Parsing Endpoint
# ---------------------------------------------------------------------------
@app.post("/api/upload-resume")
async def upload_resume_file(file: UploadFile = File(...)):
    filename = file.filename.lower()
    content = await file.read()
    extracted_text = ""

    try:
        if filename.endswith(".pdf"):
            pdf_file = io.BytesIO(content)
            reader = PdfReader(pdf_file)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
        else:
            # Plain text / markdown files
            extracted_text = content.decode("utf-8", errors="ignore")

        extracted_text = extracted_text.strip()
        if not extracted_text:
            return {"status": "error", "message": "Could not extract text from file."}

        return {"status": "success", "filename": file.filename, "text": extracted_text}

    except Exception as e:
        logger.error(f"Error reading resume file: {e}", exc_info=True)
        return {"status": "error", "message": str(e)}


# ---------------------------------------------------------------------------
# Sandboxed Code Execution Endpoint
# ---------------------------------------------------------------------------
@app.post("/api/run-code")
async def run_sandboxed_code(req: CodeExecutionRequest):
    if req.language.lower() != "python":
        return {"status": "error", "output": "Currently only Python execution is supported in the sandbox."}

    full_code = req.code
    if req.test_cases:
        full_code += "\n\n# --- AUTOMATED TEST RUNNER ---\n" + req.test_cases

    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as temp_file:
        temp_file.write(full_code)
        temp_file_path = temp_file.name

    try:
        # Isolated execution with a 4.0-second timeout guard
        result = subprocess.run(
            [sys.executable, temp_file_path],
            capture_output=True,
            text=True,
            timeout=4.0
        )
        output = result.stdout
        if result.stderr:
            output += "\nError Traceback:\n" + result.stderr

        return {
            "status": "success" if result.returncode == 0 else "failed",
            "output": output.strip() or "Program executed successfully with no output."
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "output": "Execution timed out (Time Limit Exceeded - 4s limit)."}
    except Exception as e:
        return {"status": "error", "output": f"Execution error: {str(e)}"}
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


# ---------------------------------------------------------------------------
# WebSocket Interview Streaming Endpoint
# ---------------------------------------------------------------------------
@app.websocket("/ws/interview")
async def websocket_interview_endpoint(websocket: WebSocket):
    await websocket.accept()
    session: Optional[InterviewSession] = None
    session_id: Optional[str] = None
    role: str = "Software Engineer"
    experience_level: str = "Mid-Level"

    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            msg_type = data.get("type")

            # 1. Initialize session with role, level, persona, and company profile
            if msg_type == "init":
                session_id = data.get("session_id", "default_session")
                role = data.get("role", "Software Engineer")
                experience_level = data.get("experience_level", "Mid-Level")
                resume_text = data.get("resume_text", "").strip()
                persona = data.get("persona", "mentor")
                company_style = data.get("company_style", "google")

                session = InterviewSession(
                    role=role,
                    experience_level=experience_level,
                    persona=persona,
                    company_style=company_style
                )
                logger.info(
                    f"Initialized session {session_id} for {role} ({experience_level}) | Persona: {persona} | Company: {company_style}"
                )

                greeting = session.start_interview(resume_text)
                current_stage = getattr(session, "current_stage", "INTRO")

                await websocket.send_json({
                    "type": "agent_speech",
                    "text": greeting,
                    "stage": current_stage
                })

            # 2. Dynamic resume upload or updates
            elif msg_type == "upload_resume":
                if session:
                    resume_text = data.get("resume_text", "").strip()
                    if resume_text:
                        session.resume_text = resume_text
                        logger.info(f"Updated resume text for session {session_id}")

            # 3. Candidate submits spoken, typed, or code responses
            elif msg_type == "candidate_answer":
                if not session:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Session not initialized. Please reconnect."
                    })
                    continue

                transcript = data.get("transcript", "").strip()
                if not transcript:
                    continue

                logger.info(f"Processing candidate answer for session {session_id}")

                # Unpack response safely whether it returns (reply, stage) or str
                result = session.respond(transcript)
                if isinstance(result, tuple) and len(result) == 2:
                    agent_followup, current_stage = result
                else:
                    agent_followup = result
                    current_stage = getattr(session, "current_stage", "INTERVIEW")

                await websocket.send_json({
                    "type": "agent_speech",
                    "text": agent_followup,
                    "stage": current_stage
                })

            # 4. Candidate ends the interview
            elif msg_type == "end_interview":
                logger.info(f"Ending session {session_id} per candidate request.")
                if session and session_id:
                    session_store[session_id] = {
                        "role": role,
                        "history": session.history
                    }

                await websocket.send_json({
                    "type": "interview_concluded",
                    "session_id": session_id,
                    "message": "Interview completed. Scorecard is ready."
                })
                break

    except WebSocketDisconnect:
        logger.warning(f"Client disconnected from session {session_id}")
        if session and session_id:
            session_store[session_id] = {
                "role": role,
                "history": session.history
            }
    except Exception as e:
        logger.error(f"Error in websocket loop: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Scorecard Evaluation Endpoint
# ---------------------------------------------------------------------------
@app.post("/api/evaluate")
def evaluate_interview(req: EvaluationRequest):
    session_data = session_store.get(req.session_id)
    if not session_data or not session_data.get("history"):
        raise HTTPException(
            status_code=404,
            detail="Session transcript not found or insufficient history to evaluate."
        )

    try:
        scorecard = evaluator.generate_scorecard(
            role=req.role or session_data.get("role", "Software Engineer"),
            history=session_data["history"],
            speaking_time_seconds=req.speaking_time_seconds or 120.0,
            vision_metrics=req.vision_metrics
        )
        return {"status": "success", "scorecard": scorecard}
    except Exception as e:
        logger.error(f"Failed to generate scorecard: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Export Performance Report as PDF Endpoint
# ---------------------------------------------------------------------------
@app.post("/api/export-report-pdf")
async def export_report_pdf(req: PDFExportRequest):
    data = req.scorecard
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#4f46e5'),
        spaceAfter=8
    )
    subtitle_style = ParagraphStyle(
        'SubStyle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=14
    )
    h2_style = ParagraphStyle(
        'H2Style',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#334155'),
        leading=13
    )

    story = []

    # Title Banner
    story.append(Paragraph("AI Mock Interview Performance Report", title_style))
    story.append(Paragraph(
        f"Role: <b>{req.role}</b> | Overall Rating: <b>{data.get('overall_score', 80)}/100</b>",
        subtitle_style
    ))
    story.append(Spacer(1, 8))

    # Speech Metrics Summary Table
    speech = data.get("speech_metrics", {})
    metrics_data = [
        ["Total Words", "Speaking Pace (WPM)", "Pace Status", "Filler Words Count"],
        [
            str(speech.get("total_words", 0)),
            f"{speech.get('estimated_wpm', 130)} WPM",
            str(speech.get("pace_verdict", "Optimal")),
            str(speech.get("total_filler_words", 0))
        ]
    ]
    t = Table(metrics_data, colWidths=[130, 130, 140, 130])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1e293b')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 14))

    # Rubrics Breakdown
    story.append(Paragraph("1. Technical & Behavioral Rubrics", h2_style))
    tech = data.get("technical_depth", {})
    comm = data.get("communication_clarity", {})
    beh = data.get("behavioral_alignment", {})
    non_verbal = data.get("non_verbal_presence", {})
    vision = data.get("vision_metrics", {})

    tech_strengths = ", ".join(tech.get("strengths", [])[:2]) or "Strong domain understanding."
    comm_strengths = ", ".join(comm.get("strengths", [])[:2]) or "Structured articulate delivery."
    beh_feedback = beh.get("star_methodology_adherence", "Good structural flow.")
    non_verbal_feedback = non_verbal.get(
        "body_language_feedback",
        f"Eye contact: {vision.get('eye_contact_percentage', 85)}%. Maintained consistent composure."
    )

    rubric_summary = [
        ["Category", "Score", "Evaluator Assessment"],
        ["Technical Depth", f"{tech.get('score', 80)}%", Paragraph(tech_strengths, body_style)],
        ["Communication", f"{comm.get('score', 80)}%", Paragraph(comm_strengths, body_style)],
        ["STAR Adherence", f"{beh.get('score', 85)}%", Paragraph(beh_feedback, body_style)],
        ["Non-Verbal Presence", f"{non_verbal.get('score', 85)}%", Paragraph(non_verbal_feedback, body_style)],
    ]
    rubric_table = Table(rubric_summary, colWidths=[120, 60, 350])
    rubric_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(rubric_table)
    story.append(Spacer(1, 14))

    # Question Breakdown & Senior Model Answers
    story.append(Paragraph("2. Question Breakdown & Model Answers", h2_style))
    questions = data.get("question_evaluations", [])[:4]
    for idx, q in enumerate(questions, 1):
        story.append(Paragraph(f"<b>Q{idx}: {q.get('question')}</b>", body_style))
        story.append(Paragraph(f"<i>Candidate Answer:</i> {q.get('candidate_answer')}", body_style))
        story.append(Paragraph(f"<i>Critique:</i> {q.get('critique')}", body_style))
        story.append(Paragraph(f"<b>Senior Model Answer:</b> {q.get('senior_model_answer')}", body_style))
        story.append(Spacer(1, 8))

    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    filename_safe = req.role.replace(" ", "_").replace("/", "_")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Interview_Scorecard_{filename_safe}.pdf"}
    )