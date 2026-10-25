import React from 'react';
import { Award, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

export default function Scorecard({ data, onRestart }) {
  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-slate-100">
      <div className="text-center mb-8">
        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-full uppercase tracking-wider">
          Evaluation Report
        </span>
        <h2 className="text-3xl font-bold mt-2">Interview Performance Scorecard</h2>
        <p className="text-slate-400 text-sm mt-1">{data.summary}</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Overall Score", value: data.overall_score, color: "text-emerald-400" },
          { label: "Technical Competency", value: data.technical_competency_score, color: "text-indigo-400" },
          { label: "Communication", value: data.communication_score, color: "text-blue-400" },
          { label: "Problem Solving", value: data.problem_solving_score, color: "text-amber-400" },
        ].map((item, idx) => (
          <div key={idx} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 text-center">
            <div className={`text-3xl font-extrabold ${item.color}`}>{item.value}%</div>
            <div className="text-xs text-slate-400 font-medium mt-1">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="p-5 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
          <h3 className="flex items-center gap-2 text-emerald-400 font-semibold mb-3 text-sm">
            <CheckCircle2 className="w-4 h-4" /> Demonstrated Strengths
          </h3>
          <ul className="space-y-2">
            {data.key_strengths?.map((point, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-5 bg-amber-950/20 border border-amber-800/40 rounded-xl">
          <h3 className="flex items-center gap-2 text-amber-400 font-semibold mb-3 text-sm">
            <AlertTriangle className="w-4 h-4" /> Targeted Areas to Improve
          </h3>
          <ul className="space-y-2">
            {data.areas_for_improvement?.map((point, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations */}
      <div className="p-5 bg-slate-800/40 border border-slate-700/60 rounded-xl mb-8">
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-indigo-400" /> Actionable Recommendations
        </h3>
        <div className="space-y-2">
          {data.actionable_recommendations?.map((rec, i) => (
            <p key={i} className="text-xs text-slate-300">
              <strong className="text-indigo-300">Step {i + 1}:</strong> {rec}
            </p>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition"
        >
          <RotateCcw className="w-4 h-4" /> Practice Another Session
        </button>
      </div>
    </div>
  );
}