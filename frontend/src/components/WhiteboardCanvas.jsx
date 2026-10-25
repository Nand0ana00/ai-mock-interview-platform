import React, { useRef, useState, useEffect } from 'react';
import { Square, Database, Cloud, Type, Trash2, Undo } from 'lucide-react';

export default function WhiteboardCanvas({ onExport }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen'); // 'pen' | 'rect' | 'db' | 'cloud' | 'text'
  const [color, setColor] = useState('#818cf8');
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState([]);
  const startPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    saveSnapshot();
  }, []);

  const saveSnapshot = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setHistory((prev) => [...prev.slice(-15), canvas.toDataURL()]);
      if (onExport) onExport(canvas.toDataURL());
    }
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const prevHistory = history.slice(0, -1);
    const lastState = prevHistory[prevHistory.length - 1];
    setHistory(prevHistory);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.src = lastState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      if (onExport) onExport(lastState);
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveSnapshot();
  };

  const startDraw = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    startPos.current = { x, y };
    setIsDrawing(true);

    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = color;
    ctx.fillStyle = color;

    if (tool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvasRef.current.getContext('2d');

    if (tool === 'pen') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDraw = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = canvasRef.current.getContext('2d');

    const sx = startPos.current.x;
    const sy = startPos.current.y;
    const w = x - sx;
    const h = y - sy;

    if (tool === 'rect') {
      ctx.strokeRect(sx, sy, w, h);
    } else if (tool === 'db') {
      // Draw standard database cylinder icon
      ctx.beginPath();
      ctx.ellipse(sx + w / 2, sy + 15, Math.abs(w / 2), 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(sx, sy + 15, w, Math.max(h - 30, 20));
      ctx.beginPath();
      ctx.ellipse(sx + w / 2, sy + 15 + Math.max(h - 30, 20), Math.abs(w / 2), 10, 0, 0, Math.PI);
      ctx.stroke();
    } else if (tool === 'text') {
      const text = prompt('Enter component label (e.g., Redis Cache, Load Balancer):');
      if (text) {
        ctx.font = '13px monospace';
        ctx.fillText(text, sx, sy);
      }
    }
    saveSnapshot();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-slate-800 bg-slate-900/90 text-xs text-slate-300">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTool('pen')}
            className={`p-1.5 rounded-lg border ${tool === 'pen' ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'border-slate-800 hover:bg-slate-800'}`}
          >
            Pen
          </button>
          <button
            onClick={() => setTool('rect')}
            className={`p-1.5 rounded-lg border ${tool === 'rect' ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'border-slate-800 hover:bg-slate-800'}`}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('db')}
            className={`p-1.5 rounded-lg border ${tool === 'db' ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'border-slate-800 hover:bg-slate-800'}`}
          >
            <Database className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-1.5 rounded-lg border ${tool === 'text' ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300' : 'border-slate-800 hover:bg-slate-800'}`}
          >
            <Type className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {['#818cf8', '#34d399', '#f87171', '#fcd34d', '#ffffff'].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-4 h-4 rounded-full border ${color === c ? 'ring-2 ring-indigo-400' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="w-[1px] h-4 bg-slate-800" />
          <button onClick={handleUndo} className="p-1.5 hover:text-white"><Undo className="w-3.5 h-3.5" /></button>
          <button onClick={clearCanvas} className="p-1.5 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {/* Drawing Canvas */}
      <div className="flex-1 w-full h-full cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}