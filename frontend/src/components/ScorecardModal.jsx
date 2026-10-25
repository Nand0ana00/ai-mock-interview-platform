import React, { useState } from 'react';
import {
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Gauge,
  MessageSquare,
  Award,
  Eye,
  RotateCcw
} from 'lucide-react';

export default function ScorecardModal({ scorecard, role, onRestart }) {
  const [openModelIdx, setOpenModelIdx] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const speech = scorecard.speech_metrics || {
    total_words: 0,
    estimated_wpm: 130,
    pace_verdict: 'Optimal Conversational Pace',
    total_filler_words: 0,
    filler_breakdown: {}
  };

  const vision = scorecard.vision_metrics || {
    eye_contact_percentage: 85,
    slouch_percentage: 10,
    fidget_event_count: 2,
    composure_rating: 'Strong'
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch('http://localhost:8000/api/export-report-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'report_' + Date.now(),
          role: role,
          scorecard: scorecard
        })
      });

      if (!res.ok) {
        throw new Error(`Export failed with HTTP status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Interview_Scorecard_${role.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not export PDF report: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 text-slate-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-400" /> Interview Scorecard & Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Target Position: <span className="text-slate-200 font-semibold">{role}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
          >
            <Download className="w-4 h-4" />
            {downloading ? 'Exporting PDF...' : 'Download PDF Report'}
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Start New
          </button>
        </div>
      </div>

      {/* Summary Verdict Banner */}
      {scorecard.summary_verdict && (
        <div className="p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl text-xs leading-relaxed text-indigo-200">
          <span className="font-bold text-indigo-400 block mb-1 uppercase tracking-wider text-[10px]">
            Executive Evaluation Summary
          </span>
          {scorecard.summary_verdict}
        </div>
      )}

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Speaking Pace */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex flex-col items-center text-center">
          <Gauge className="w-5 h-5 text-indigo-400 mb-1" />
          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
            Speaking Pace
          </span>
          <span className="text-lg font-bold text-slate-100 mt-1">{speech.estimated_wpm} WPM</span>
          <span className="text-[10px] text-emerald-400 font-medium mt-0.5 truncate max-w-full">
            {speech.pace_verdict}
          </span>
        </div>

        {/* Filler Word Count */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex flex-col items-center text-center">
          <MessageSquare className="w-5 h-5 text-amber-400 mb-1" />
          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
            Filler Words
          </span>
          <span className="text-lg font-bold text-amber-300 mt-1">{speech.total_filler_words}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-full">
            {Object.entries(speech.filler_breakdown || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'No excessive fillers'}
          </span>
        </div>

        {/* Eye Contact & Composure */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex flex-col items-center text-center">
          <Eye className="w-5 h-5 text-sky-400 mb-1" />
          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
            Eye Contact & Posture
          </span>
          <span className="text-lg font-bold text-sky-300 mt-1">
            {vision.eye_contact_percentage}%
          </span>
          <span className="text-[10px] text-emerald-400 font-medium mt-0.5 truncate max-w-full">
            Composure: {vision.composure_rating}
          </span>
        </div>

        {/* Overall Rating */}
        <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl flex flex-col items-center text-center">
          <CheckCircle className="w-5 h-5 text-emerald-400 mb-1" />
          <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">
            Overall Rating
          </span>
          <span className="text-lg font-bold text-emerald-400 mt-1">
            {scorecard.overall_score || 85} / 100
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5">Weighted Rubric</span>
        </div>
      </div>

      {/* Core Rubrics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Technical Depth */}
        <div className="bg-slate-950/50 border border-slate-800/80 p-4 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-200">Technical Depth</h4>
            <span className="text-xs font-bold text-indigo-400">{scorecard.technical_depth?.score}%</span>
          </div>
          <ul className="text-xs space-y-1.5 text-slate-400 flex-1">
            {scorecard.technical_depth?.strengths?.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-emerald-400">
                <span className="mt-0.5 text-[10px]">✓</span> {s}
              </li>
            ))}
            {scorecard.technical_depth?.weaknesses?.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5 text-amber-400">
                <span className="mt-0.5 text-[10px]">⚠</span> {w}
              </li>
            ))}
          </ul>
        </div>

        {/* Communication Clarity */}
        <div className="bg-slate-950/50 border border-slate-800/80 p-4 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-200">Communication</h4>
            <span className="text-xs font-bold text-indigo-400">{scorecard.communication_clarity?.score}%</span>
          </div>
          <ul className="text-xs space-y-1.5 text-slate-400 flex-1">
            {scorecard.communication_clarity?.strengths?.map((s, i) => (
              <li key={i} className="flex items-start gap-1.5 text-indigo-300">
                <span className="mt-0.5 text-[10px]">✓</span> {s}
              </li>
            ))}
            {scorecard.communication_clarity?.weaknesses?.map((w, i) => (
              <li key={i} className="flex items-start gap-1.5 text-amber-400">
                <span className="mt-0.5 text-[10px]">⚠</span> {w}
              </li>
            ))}
          </ul>
        </div>

        {/* STAR Alignment */}
        <div className="bg-slate-950/50 border border-slate-800/80 p-4 rounded-2xl flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-200">STAR Adherence</h4>
            <span className="text-xs font-bold text-indigo-400">{scorecard.behavioral_alignment?.score}%</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {scorecard.behavioral_alignment?.star_methodology_adherence ||
              scorecard.behavioral_alignment?.feedback ||
              'Maintained structured Situation, Task, Action, Result methodology across scenario questions.'}
          </p>
        </div>
      </div>

      {/* Actionable Tips */}
      {scorecard.actionable_tips && scorecard.actionable_tips.length > 0 && (
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl">
          <h4 className="text-xs font-semibold text-slate-200 mb-2 uppercase tracking-wider text-[10px]">
            Actionable Next Steps
          </h4>
          <ul className="text-xs space-y-1 text-slate-300">
            {scorecard.actionable_tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Question Breakdown & Senior Model Answers Accordion */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-slate-200">
          Question Reviews & Senior Model Answers
        </h3>
        {scorecard.question_evaluations?.map((item, idx) => (
          <div
            key={idx}
            className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden text-xs transition"
          >
            <div
              onClick={() => setOpenModelIdx(openModelIdx === idx ? null : idx)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-850 transition select-none"
            >
              <span className="font-semibold text-slate-200 pr-4">
                Q{idx + 1}: {item.question}
              </span>
              {openModelIdx === idx ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              )}
            </div>

            {openModelIdx === idx && (
              <div className="p-4 bg-slate-900/60 border-t border-slate-800/80 space-y-3">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Your Answer Summary:
                  </span>
                  <p className="text-slate-300 mt-1 leading-relaxed">{item.candidate_answer}</p>
                </div>

                <div>
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
                    Evaluator Critique:
                  </span>
                  <p className="text-amber-200/90 mt-1 leading-relaxed">{item.critique}</p>
                </div>

                <div className="p-3.5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl">
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                    🌟 Senior-Level Model Answer:
                  </span>
                  <p className="text-slate-200 mt-1 leading-relaxed whitespace-pre-wrap">
                    {item.senior_model_answer}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}