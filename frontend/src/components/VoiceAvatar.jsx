import React, { useEffect, useRef } from 'react';

export default function VoiceAvatar({ isSpeaking, stage }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Increase animation speed when speaking
      phaseRef.current += isSpeaking ? 0.08 : 0.02;

      // Layered sine wave frequency definitions
      const layers = [
        { color: 'rgba(99, 102, 241, 0.25)', speed: 1.0, freq: 0.03, amp: isSpeaking ? 28 : 6 },
        { color: 'rgba(168, 85, 247, 0.4)', speed: 1.4, freq: 0.02, amp: isSpeaking ? 22 : 4 },
        { color: 'rgba(56, 189, 248, 0.85)', speed: 2.0, freq: 0.04, amp: isSpeaking ? 16 : 3 },
      ];

      layers.forEach((layer) => {
        ctx.beginPath();
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = isSpeaking ? 2.5 : 1.5;

        for (let x = 0; x < width; x++) {
          // Attenuate waves near the left and right canvas edges
          const envelope = Math.sin((x / width) * Math.PI);
          const y =
            centerY +
            Math.sin(x * layer.freq + phaseRef.current * layer.speed) *
              layer.amp *
              envelope;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Central pulsing core orb
      const orbRadius = isSpeaking
        ? 24 + Math.sin(phaseRef.current * 3) * 4
        : 20;

      const gradient = ctx.createRadialGradient(
        width / 2,
        centerY,
        4,
        width / 2,
        centerY,
        orbRadius * 1.8
      );
      gradient.addColorStop(0, isSpeaking ? 'rgba(129, 140, 248, 0.9)' : 'rgba(99, 102, 241, 0.6)');
      gradient.addColorStop(0.6, isSpeaking ? 'rgba(168, 85, 247, 0.3)' : 'rgba(79, 70, 229, 0.2)');
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0)');

      ctx.beginPath();
      ctx.arc(width / 2, centerY, orbRadius * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSpeaking]);

  return (
    <div className="relative flex flex-col items-center justify-center p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl backdrop-blur-md shadow-inner">
      <canvas
        ref={canvasRef}
        width={360}
        height={90}
        className="w-full max-w-[360px] h-[90px]"
      />
      <div className="flex items-center gap-2 mt-1">
        <span
          className={`w-2 h-2 rounded-full ${
            isSpeaking ? 'bg-indigo-400 animate-ping' : 'bg-slate-600'
          }`}
        />
        <span className="text-[11px] font-medium text-slate-400 tracking-wide uppercase">
          {isSpeaking
            ? `Interviewer Speaking (${stage || 'AI'})`
            : 'Listening Mode (Speak to answer or interrupt)'}
        </span>
      </div>
    </div>
  );
}
