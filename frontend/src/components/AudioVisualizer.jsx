import React from 'react';

export default function AudioVisualizer({ level, isRecording }) {
  const bars = [0.4, 0.7, 1.0, 0.8, 0.5];

  return (
    <div className="flex items-center gap-1.5 h-6">
      {bars.map((weight, idx) => {
        const height = isRecording ? Math.max(4, Math.round(level * weight * 0.25)) : 4;
        return (
          <div
            key={idx}
            className={`w-1 rounded-full transition-all duration-75 ${
              isRecording ? 'bg-indigo-400' : 'bg-slate-600'
            }`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}