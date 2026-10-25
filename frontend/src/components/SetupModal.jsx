import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Video,
  Mic,
  CameraOff,
  MicOff,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Building2,
  UserCheck
} from 'lucide-react';

const ROLES = [
  'Full Stack Engineer',
  'Frontend Developer',
  'Backend Developer',
  'AI / Machine Learning Engineer',
  'DevOps / Cloud Engineer',
  'Data Engineer'
];

const EXPERIENCE_LEVELS = [
  'Intern / Entry-Level',
  'Junior (1-2 yrs)',
  'Mid-Level (3-5 yrs)',
  'Senior (5+ yrs)'
];

const PERSONAS = [
  { id: 'mentor', label: 'Friendly Mentor', desc: 'Supportive, guiding hints' },
  { id: 'faang_lead', label: 'FAANG Staff Lead', desc: 'Strict edge-cases & scale' },
  { id: 'startup_founder', label: 'Startup Founder', desc: 'Speed, ownership & MVP' }
];

const COMPANY_PROFILES = [
  { id: 'google', label: 'Google', sub: 'DSA & Scale' },
  { id: 'amazon', label: 'Amazon', sub: 'Leadership Principles' },
  { id: 'atlassian', label: 'Atlassian', sub: 'Team Collaboration' },
  { id: 'startup', label: 'YC Startup', sub: 'Fast Execution' }
];

export default function SetupModal({ onStart }) {
  const [activeTab, setActiveTab] = useState('context'); // 'context' | 'hardware'

  // Context & Customization State
  const [role, setRole] = useState(ROLES[0]);
  const [level, setLevel] = useState(EXPERIENCE_LEVELS[2]);
  const [persona, setPersona] = useState('mentor');
  const [companyStyle, setCompanyStyle] = useState('google');
  const [resumeText, setResumeText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // AV Hardware Test State
  const [cameraActive, setCameraActive] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  // Resume file upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');
    setUploadedFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:8000/api/upload-resume', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'success' && data.text) {
        setResumeText(data.text);
      } else {
        setUploadError(data.message || 'Failed to extract text from file.');
      }
    } catch (err) {
      setUploadError('Failed to communicate with upload server: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Hardware Diagnostic Test Routine
  const testMedia = async () => {
    try {
      // Clean up any existing streams and audio contexts
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setMicActive(true);

      // Analyze microphone volume level in real time
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const sampleAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicLevel(Math.min(100, Math.round(avg * 2.4)));
        animFrameRef.current = requestAnimationFrame(sampleAudio);
      };
      sampleAudio();
    } catch (err) {
      console.warn('AV Permissions not granted or hardware locked:', err);
      setCameraActive(false);
      setMicActive(false);
      setMicLevel(0);
    }
  };

  useEffect(() => {
    if (activeTab === 'hardware') {
      testMedia();
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeTab]);

  const handleStartInterview = () => {
    // Release hardware preview stream before entering the interview room
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    onStart({
      role,
      level,
      persona,
      companyStyle,
      resume: resumeText.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Step Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60">
          <button
            onClick={() => setActiveTab('context')}
            className={`flex-1 py-3.5 text-xs font-semibold text-center transition flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'context'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" /> 1. Role & Context
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`flex-1 py-3.5 text-xs font-semibold text-center transition flex items-center justify-center gap-2 border-b-2 ${
              activeTab === 'hardware'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-4 h-4" /> 2. AV Hardware Check
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {activeTab === 'context' && (
            <div className="space-y-4">
              {/* Role & Level Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Target Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300">Seniority Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition"
                  >
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interviewer Persona Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Interviewer Persona
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPersona(p.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        persona === p.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-slate-100 ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-200">{p.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Company Profile */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" /> Target Company Culture
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COMPANY_PROFILES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCompanyStyle(c.id)}
                      className={`p-2 rounded-xl border text-center transition ${
                        companyStyle === c.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold">{c.label}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{c.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resume File Upload Box */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" /> Resume / Project Context
                  </span>
                  {uploadedFileName && (
                    <span className="text-[11px] text-emerald-400 font-normal">
                      ✓ {uploadedFileName}
                    </span>
                  )}
                </label>

                <div className="relative border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 bg-slate-950/50 text-center transition">
                  <input
                    type="file"
                    accept=".pdf,.txt,.md"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center gap-1">
                    <Upload className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-300">
                      {isUploading ? 'Extracting Resume Text...' : 'Click or drop your Resume (PDF / TXT)'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Questions will be grounded directly in your uploaded projects & architectures
                    </span>
                  </div>
                </div>

                {uploadError && (
                  <p className="text-[11px] text-rose-400 font-medium">⚠️ {uploadError}</p>
                )}

                {/* Optional Raw Text / Edit Box */}
                {resumeText && (
                  <textarea
                    rows={3}
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    placeholder="Extracted resume text appears here..."
                    className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300 font-mono resize-none outline-none focus:border-indigo-500 transition"
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'hardware' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Webcam Feed Box */}
              <div className="relative w-full aspect-video bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />
                {!cameraActive && (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <CameraOff className="w-8 h-8 stroke-1" />
                    <span className="text-xs">Camera Offline / Blocked</span>
                  </div>
                )}
              </div>

              {/* Hardware Status Panel */}
              <div className="flex flex-col justify-between bg-slate-950/60 border border-slate-800 p-4 rounded-2xl">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-slate-300">Device Diagnostics</h4>
                    <button
                      type="button"
                      onClick={testMedia}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                    >
                      <RotateCcw className="w-3 h-3" /> Re-check
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="flex items-center gap-2 text-slate-300">
                        <Video className="w-3.5 h-3.5 text-indigo-400" /> Webcam
                      </span>
                      {cameraActive ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-400 text-[11px] font-medium">
                          <AlertCircle className="w-3.5 h-3.5" /> Blocked
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="flex items-center gap-2 text-slate-300">
                        <Mic className="w-3.5 h-3.5 text-indigo-400" /> Microphone
                      </span>
                      {micActive ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-400 text-[11px] font-medium">
                          <AlertCircle className="w-3.5 h-3.5" /> Blocked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Real-time Decibel / Mic Level Meter */}
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                      <span>Mic Input Level</span>
                      <span>{micLevel}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-400 transition-all duration-75"
                        style={{ width: `${micLevel}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Speak out loud to ensure the input bar responds smoothly.
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-2 mt-3">
                  Tip: Modern browsers require explicit permissions for Web Speech API and media stream input.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          {activeTab === 'hardware' ? (
            <button
              type="button"
              onClick={() => setActiveTab('context')}
              className="flex items-center gap-1.5 px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Role Setup
            </button>
          ) : (
            <div className="text-[11px] text-slate-500">
              Ensure role and project context are selected.
            </div>
          )}

          {activeTab === 'context' ? (
            <button
              type="button"
              onClick={() => setActiveTab('hardware')}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <span>Next: Hardware Check</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartInterview}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Enter Interview Room</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}