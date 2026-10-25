import React, { useState } from 'react';
import SetupModal from './components/SetupModal';
import InterviewRoom from './components/InterviewRoom';
import ScorecardModal from './components/ScorecardModal';
import { Bot, Sparkles } from 'lucide-react';

export default function App() {
  const [sessionConfig, setSessionConfig] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [viewState, setViewState] = useState('setup'); // 'setup' | 'interview' | 'scorecard'

  const handleStartInterview = (config) => {
    setSessionConfig(config);
    setViewState('interview');
  };

  const handleFinishInterview = (evalData) => {
    setScorecard(evalData);
    setViewState('scorecard');
  };

  const handleRestart = () => {
    setSessionConfig(null);
    setScorecard(null);
    setViewState('setup');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Application Navbar */}
      <header className="px-6 py-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              InterviewCoach.ai
              <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                Live Mock Studio
              </span>
            </h1>
          </div>
        </div>

        {viewState === 'interview' && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Session: <span className="text-slate-200 font-medium">{sessionConfig?.role}</span>
          </div>
        )}
      </header>

      {/* Main Container Views */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full flex flex-col justify-center">
        {viewState === 'setup' && (
          <SetupModal onStart={handleStartInterview} />
        )}

        {viewState === 'interview' && sessionConfig && (
          <InterviewRoom
            config={sessionConfig}
            onFinish={handleFinishInterview}
          />
        )}

        {viewState === 'scorecard' && scorecard && (
          <ScorecardModal
            scorecard={scorecard}
            role={sessionConfig?.role || 'Software Engineer'}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  );
}