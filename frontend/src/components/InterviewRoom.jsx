import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  PhoneOff,
  User,
  Bot,
  Loader2,
  RotateCcw,
  Send,
  Clock,
  Zap,
  Code2
} from 'lucide-react';
import VoiceAvatar from './VoiceAvatar';
import TechnicalWorkspace from './TechnicalWorkspace';
import VisionTracker from './VisionTracker';
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export default function InterviewRoom({ config, onFinish }) {
  const [messages, setMessages] = useState([]);
  const [turnState, setTurnState] = useState('connecting'); // 'connecting' | 'ai_speaking' | 'candidate_turn' | 'evaluating'
  const [currentRound, setCurrentRound] = useState('INTRO');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [silenceCountdown, setSilenceCountdown] = useState(null);
  const [wasInterrupted, setWasInterrupted] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(true);
  const [sessionId] = useState(() => 'sess_' + Math.random().toString(36).substr(2, 9));

  const socketRef = useRef(null);
  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const turnStateRef = useRef(turnState);
  const [visionMetrics, setVisionMetrics] = useState({
  eye_contact_percentage: 85,
  slouch_percentage: 10,
  fidget_event_count: 2,
  composure_rating: 'Strong'
  });

  // Sync turnState to ref for speech recognition event listeners
  useEffect(() => {
    turnStateRef.current = turnState;
  }, [turnState]);

  // Silence auto-submit timer refs
  const silenceTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const clearAutoSubmitTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSilenceCountdown(null);
  };

  const resetSilenceTimer = () => {
    clearAutoSubmitTimer();

    let timeLeft = 5;
    setSilenceCountdown(timeLeft);

    countdownIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      if (timeLeft <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      } else {
        setSilenceCountdown(timeLeft);
      }
    }, 1000);

    silenceTimerRef.current = setTimeout(() => {
      if (transcriptRef.current.trim().length > 0) {
        handleSubmitAnswer();
      } else {
        clearAutoSubmitTimer();
      }
    }, 5000);
  };

  // Cross-browser speech synthesis
  const speakText = (text, onComplete) => {
    clearAutoSubmitTimer();

    if (!('speechSynthesis' in window)) {
      if (onComplete) onComplete();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';

      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred =
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Google') || v.name.includes('English') || v.name.includes('Natural'))
          ) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0];

        if (preferred) utterance.voice = preferred;
      }

      utterance.onend = () => {
        if (onComplete) onComplete();
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        if (onComplete) onComplete();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('TTS error:', err);
      if (onComplete) onComplete();
    }
  };

  // Setup Web Speech Recognition with Barge-in Interruption Support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Web Speech API not supported in this browser. You can type your answers below.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
      isListeningRef.current = true;
    };

    recognition.onresult = (event) => {
      let finalStr = '';
      for (let i = 0; i < event.results.length; ++i) {
        finalStr += event.results[i][0].transcript;
      }

      const cleanStr = finalStr.trim();
      if (!cleanStr) return;

      // Natural Barge-in Interruption logic: cuts off AI if candidate starts speaking
      if (turnStateRef.current === 'ai_speaking') {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setTurnState('candidate_turn');
        setWasInterrupted(true);
        setTimeout(() => setWasInterrupted(false), 3000);
      }

      setTranscript(cleanStr);
      resetSilenceTimer();
    };

    recognition.onerror = (event) => {
      console.warn('SpeechRecognition error:', event.error);
      if (event.error === 'not-allowed') {
        setSpeechError('Microphone permission blocked. Please enable it in browser settings.');
      }
      setIsRecording(false);
      isListeningRef.current = false;
    };

    recognition.onend = () => {
      setIsRecording(false);
      isListeningRef.current = false;
      // Auto-restart recognition while in active interview turns
      if (turnStateRef.current !== 'evaluating' && turnStateRef.current !== 'connecting') {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearAutoSubmitTimer();
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition already active:', err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
    setIsRecording(false);
    isListeningRef.current = false;
  };

  const toggleMic = () => {
    if (isRecording) {
      stopListening();
      clearAutoSubmitTimer();
    } else {
      startListening();
    }
  };

  // WebSocket Connection
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/interview');
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'init',
          session_id: sessionId,
          role: config.role,
          experience_level: config.level,
          resume_text: config.resume || '',
        })
      );
    };

    ws.onmessage = (event) => {
      const data = jsonParseSafe(event.data);
      if (!data) return;

      if (data.type === 'agent_speech') {
        const questionText = data.text;
        if (data.stage) setCurrentRound(data.stage);

        setMessages((prev) => [...prev, { role: 'ai', text: questionText }]);
        setTurnState('ai_speaking');
        clearAutoSubmitTimer();

        // Keep listening during playback to support interruptions
        startListening();

        setTimeout(() => {
          speakText(questionText, () => {
            if (turnStateRef.current === 'ai_speaking') {
              setTurnState('candidate_turn');
            }
          });
        }, 150);
      }

      if (data.type === 'interview_concluded') {
        fetchEvaluation();
      }
    };

    return () => {
      clearAutoSubmitTimer();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (ws) ws.close();
      stopListening();
    };
  }, []);

  const jsonParseSafe = (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  };

  const handleSubmitAnswer = () => {
    clearAutoSubmitTimer();

    const answer = (transcriptRef.current || transcript).trim();
    if (!answer) return;

    setMessages((prev) => [...prev, { role: 'user', text: answer }]);
    setTurnState('connecting');

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'candidate_answer',
          transcript: answer,
        })
      );
    }

    setTranscript('');
    transcriptRef.current = '';
  };

  // Handler for sharing code or whiteboard output directly with Gemini
  const handleTechnicalShare = ({ code, terminal_output }) => {
    clearAutoSubmitTimer();
    const payloadText = `[Candidate shared Code Implementation]:\n\`\`\`python\n${code}\n\`\`\`\n\nExecution Output:\n${terminal_output || 'No output recorded.'}`;

    setMessages((prev) => [...prev, { role: 'user', text: payloadText }]);
    setTurnState('connecting');

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'candidate_answer',
          transcript: payloadText,
        })
      );
    }
  };

  const handleEndInterview = () => {
    clearAutoSubmitTimer();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    stopListening();
    setTurnState('evaluating');

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'end_interview' }));
    } else {
      fetchEvaluation();
    }
  };

  const fetchEvaluation = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          role: config.role,
          vision_metrics: visionMetrics
        }),
      });
      const data = await res.json();
      onFinish(data.scorecard);
    } catch (err) {
      console.error('Evaluation error:', err);
      alert('Could not fetch scorecard.');
    }
  };
  return (
    <div className="flex flex-col h-[88vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-200">
            {config.role} <span className="text-xs text-slate-500 font-normal">({config.level})</span>
          </span>
        </div>

        {/* Sequential Round Badges */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl text-[11px] font-medium border border-slate-800">
          {['INTRO', 'HR', 'MR', 'TECHNICAL'].map((round) => (
            <span
              key={round}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentRound === round
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                  : 'text-slate-500'
              }`}
            >
              {round}
            </span>
          ))}
        </div>

        {/* Controls & Action Badges */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowWorkspace((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
              showWorkspace
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            {showWorkspace ? 'Hide Workspace' : 'Show Workspace'}
          </button>

          {wasInterrupted && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full text-xs font-medium animate-pulse">
              <Zap className="w-3 h-3" /> Interrupted AI
            </span>
          )}

          {turnState === 'ai_speaking' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-full text-xs font-medium animate-pulse">
              <Volume2 className="w-3.5 h-3.5" /> Speaking...
            </span>
          )}
          {turnState === 'candidate_turn' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-medium">
              <Mic className="w-3.5 h-3.5" /> Your Turn
            </span>
          )}
          {turnState === 'connecting' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking...
            </span>
          )}

          <button
            onClick={handleEndInterview}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-medium rounded-lg transition"
          >
            <PhoneOff className="w-3.5 h-3.5" /> End Interview
          </button>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Voice Dialogue Stream */}
        <div className={`flex flex-col h-full border-r border-slate-800 ${showWorkspace ? 'w-full md:w-1/2' : 'w-full'}`}>
          {/* Animated Waveform AI Avatar */}
          <div className="p-4 bg-slate-950/40 border-b border-slate-800/80">
            <VoiceAvatar isSpeaking={turnState === 'ai_speaking'} stage={currentRound} />
          </div>

          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 max-w-2xl ${
                  m.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-indigo-400 border border-slate-700'
                  }`}
                >
                  {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className="flex flex-col gap-1">
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-indigo-600/30 border border-indigo-500/30 text-slate-100'
                        : 'bg-slate-800/60 border border-slate-700/60 text-slate-200'
                    }`}
                  >
                    {m.text}
                  </div>

                  {m.role === 'ai' && (
                    <button
                      type="button"
                      onClick={() => speakText(m.text)}
                      className="self-start text-[11px] text-slate-500 hover:text-indigo-400 flex items-center gap-1 mt-0.5 px-1 py-0.5 transition"
                    >
                      <RotateCcw className="w-3 h-3" /> Replay voice
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Answer Controls & 5-Second Silence Timer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col gap-2">
            {speechError && (
              <p className="text-[11px] text-amber-400 font-medium">⚠️ {speechError}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMic}
                title={isRecording ? 'Mute Microphone' : 'Unmute Microphone'}
                className={`p-3 rounded-xl border transition flex items-center justify-center ${
                  isRecording
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isRecording ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <input
                type="text"
                value={transcript}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  if (e.target.value.trim()) {
                    resetSilenceTimer();
                  } else {
                    clearAutoSubmitTimer();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitAnswer();
                }}
                placeholder={
                  isRecording
                    ? 'Listening... (auto-submits after 5s of silence)'
                    : 'Click mic to speak, or type your answer here...'
                }
                className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500 transition"
              />

              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={!transcript.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
              >
                <span>Submit</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
              <div className="flex items-center gap-2">
                <span>
                  {isRecording ? '🔴 Mic Active (Speak freely or interrupt)' : '⚪ Mic Idle'}
                </span>
                {silenceCountdown !== null && transcript.trim() && (
                  <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium animate-pulse">
                    <Clock className="w-3 h-3" /> Auto-submitting in {silenceCountdown}s
                  </span>
                )}
              </div>
              <span>Press Enter or click Submit anytime</span>
            </div>
          </div>
        </div>

        {/* Right Side: Monaco Code Editor & Whiteboard Workspace */}
        {showWorkspace && (
          <div className="hidden md:flex flex-1 h-full bg-slate-950">
            <TechnicalWorkspace onSendToInterviewer={handleTechnicalShare} />
          </div>
        )}
      </div>
    </div>
  );
}