<div align="center">

# 🎙️ InterviewCoach.ai
### Enterprise-Grade Adaptive AI Technical & Behavioral Interview Platform

[![Live App](https://img.shields.io/badge/Live_Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://ai-mock-interview-platform-xi-umber.vercel.app)
[![API Engine](https://img.shields.io/badge/Backend_API-Render-46e3b7?style=for-the-badge&logo=render)](https://ai-mock-interview-platform-mr2e.onrender.com)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-3.5_Flash_Lite-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev/)
[![MediaPipe](https://img.shields.io/badge/Vision-MediaPipe_FaceMesh-FF6F00?style=for-the-badge&logo=google)](https://developers.google.com/mediapipe)

<p align="center">
  <b>Simulate real-world engineering loops with live voice turn-taking, natural barge-in interruptions, local computer vision posture tracking, sandboxed coding, and executive hiring bar-raiser evaluations.</b>
</p>

[Explore Live Demo](https://ai-mock-interview-platform-xi-umber.vercel.app) • [API Endpoint](https://ai-mock-interview-platform-mr2e.onrender.com) • [Report Bug](https://github.com/Nand0ana00/ai-mock-interview-platform/issues)

</div>

---

## ⚡ What Makes It Different?

Most mock interview bots are glorified text forms with robotic blind question tickers. **InterviewCoach.ai** mirrors actual senior hiring panels:

* **No Blind Skipping:** If an interviewer asks you to walk through your architecture and you just say *"hi I am fine"*, the agent halts, holds the round, and insists on a substantive response before advancing.
* **Natural Barge-In Interruptions:** Talk over the interviewer at any time—the browser's SpeechSynthesis engine cuts off instantly and pivots turn focus back to you.
* **Zero-Latency In-Browser Vision:** Evaluates eye contact alignment and catches slouching/fidgeting via client-side MediaPipe landmark tensors—zero video data ever leaves your device.
* **Live Dual-Pane Technical Workspace:** Seamlessly pair verbal explanations with interactive Monaco code execution (Python isolated subprocess) or live system architecture sketches.

---

## 🌟 Core System Highlights

┌────────────────────────────────────────────────────────────────────────┐
│                        Candidate Interface                             │
│   Web Speech API (STT/TTS)  │  MediaPipe FaceMesh  │  Monaco / Canvas │
└────────────────────────────────────┬───────────────────────────────────┘
│  WebSocket Stream
▼
┌────────────────────────────────────────────────────────────────────────┐
│                     FastAPI Orchestration Engine                       │
│  Turn Verifier ──▶ Persona Biasing ──▶ Code Sandbox ──▶ Scorecard Eval │
└────────────────────────────────────┬───────────────────────────────────┘
│
▼
[ Google Gemini 3.5 Flash Lite ]

### 1. Multi-Stage Adaptive Pipeline
- **Verified Progression:** Introductory Warm-Up $\rightarrow$ Cultural / Team Fit $\rightarrow$ Managerial Ambiguity & Conflict $\rightarrow$ Technical System Deep-Dive.
- **Interviewer Personas:**
  - `Friendly Mentor`: Collaborative and guiding, offering subtle clues when you stumble.
  - `FAANG Staff Lead`: Uncompromising scrutiny targeting complexity bounds ($O(N)$), race conditions, and single points of failure.
  - `Startup Founder`: Hyper-focused on shipping velocity, technical debt, and pragmatism over theory.
- **Target Company Calibrations:** Specialized probing patterns tailored for **Google** (Scale & Algorithms), **Amazon** (Leadership Principles & Ownership), **Atlassian** (Cross-functional empathy), and **YC Startups** (MVP execution).

### 2. Immersive Audio & Waveform Visualizer
- **Oscillating Sine Canvas:** A custom HTML5 canvas rendering triple-layer sine waves and a pulsing core orb that dynamically accelerates during speech and breathes during pauses.
- **Silence Auto-Submit:** Automatic 5-second silence detection countdown timer submitting candidate thoughts smoothly without requiring button clicks.

### 3. Integrated Technical Sandbox & System Whiteboard
- **Sandboxed Execution Console (`/api/run-code`):** Execute solutions in an isolated Python subprocess with a strict 4.0-second timeout guard.
- **Architecture Whiteboard:** Draw distributed systems schemas (databases, caches, load balancers, server nodes) and sync them straight into the conversation history.

### 4. Client-Side Non-Verbal Presence Engine
- **MediaPipe Iris & Nose Landmark Tracking:** Continuously computes horizontal/vertical iris drift within eye corners to measure camera gaze percentage.
- **Posture Correction Alerts:** Tracks vertical nose-bridge drift to detect slouching, presenting a subtle warning overlay in real time.

### 5. Automated Hiring Bar-Raiser Scorecard & PDF Export
- **Speech Metrics Breakdown:** Measures exact Words-Per-Minute (WPM) cadence and flags excessive filler words (`um`, `like`, `actually`, `basically`).
- **Senior-Level Model Answers:** Displays an expandable comparison showing candidate answers beside production-grade, STAR-aligned model responses.
- **Downloadable PDF Report (`/api/export-report-pdf`):** Produces a clean, styled executive PDF summary built with ReportLab.

---

## 🏗️ Technical Architecture

| Layer | Technologies | Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons | Responsive UI, state coordination, client-side timers |
| **Speech & Audio** | Web Speech API, Web Audio API, Canvas 2D | Real-time STT/TTS, decibel monitoring, audio waveforms |
| **Computer Vision** | MediaPipe FaceMesh (`@mediapipe/face_mesh`) | 100% in-browser eye contact & posture detection |
| **Editor & Workspace** | Monaco Editor (`@monaco-editor/react`), HTML5 Canvas | Live Python scripting, system architecture diagrams |
| **Backend API** | FastAPI, Uvicorn, WebSockets, Pydantic | Bidirectional streaming, session cache, code execution |
| **Intelligence** | Gemini 3.5 Flash Lite API | Context-aware adaptive dialogue & rubric evaluation |
| **Document Engine** | ReportLab, PyPDF | Binary stream PDF generation & resume ingestion |
| **Cloud Deployment** | Render (API Web Service), Vercel (Frontend CDN) | Production hosting with automated SSL/TLS |

---

## 📂 Project Directory Structure

```text
ai-mock-interview-platform/
├── backend/
│   ├── main.py                 # FastAPI application, WebSockets & API endpoints
│   ├── interview_agent.py      # Adaptive turn-taking logic & Gemini orchestration
│   ├── evaluation.py           # Speech analysis, rubric scoring & model answers
│   ├── requirements.txt        # Backend dependencies
│   └── .env.example            # Backend environment template
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SetupModal.jsx          # Role customization & AV hardware check
│   │   │   ├── InterviewRoom.jsx       # Main split-screen interview arena
│   │   │   ├── VoiceAvatar.jsx         # Oscillating waveform audio visualizer
│   │   │   ├── VisionTracker.jsx       # MediaPipe face & posture monitoring
│   │   │   ├── TechnicalWorkspace.jsx  # Monaco editor & sandboxed console
│   │   │   ├── WhiteboardCanvas.jsx    # System design drawing whiteboard
│   │   │   └── ScorecardModal.jsx      # Performance analytics & PDF export
│   │   ├── App.jsx                     # Root component & view router
│   │   └── main.jsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
└── README.md






