import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send, Code, PenTool, Terminal, CheckCircle2, AlertCircle } from 'lucide-react';
import WhiteboardCanvas from './WhiteboardCanvas';

const DEFAULT_STARTER_CODE = `# Solution Template
def solve(nums: list[int]) -> int:
    # Implement your optimal solution here
    return 0

# Test runs
print("Test 1 Result:", solve([2, 7, 11, 15]))
`;

export default function TechnicalWorkspace({ onSendToInterviewer }) {
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'whiteboard'
  const [code, setCode] = useState(DEFAULT_STARTER_CODE);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState('idle');

  const handleRunCode = async () => {
    setIsRunning(true);
    setStatus('running');
    setOutput('Running test execution in sandbox...');

    try {
      const res = await fetch('http://localhost:8000/api/run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language: 'python' }),
      });
      const data = await res.json();
      setOutput(data.output);
      setStatus(data.status === 'success' ? 'success' : 'error');
    } catch (err) {
      setOutput(`Execution failed: ${err.message}`);
      setStatus('error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitForReview = () => {
    onSendToInterviewer({
      type: 'code_submission',
      code: code,
      terminal_output: output
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
      {/* Workspace Header Tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'editor'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" /> Code Editor
          </button>
          <button
            onClick={() => setActiveTab('whiteboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'whiteboard'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" /> Architecture Whiteboard
          </button>
        </div>

        {activeTab === 'editor' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
            >
              <Play className="w-3 h-3 fill-current" /> Run Code
            </button>
            <button
              onClick={handleSubmitForReview}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition"
            >
              <Send className="w-3 h-3" /> Share with AI
            </button>
          </div>
        )}
      </div>

      {/* Editor or Whiteboard Body */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'editor' ? (
          <div className="flex flex-col h-full">
            <div className="flex-1">
              <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={(val) => setCode(val || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  automaticLayout: true,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                }}
              />
            </div>

            {/* Execution Sandbox Output Terminal */}
            <div className="h-44 border-t border-slate-800 bg-slate-950 flex flex-col">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/80 text-[11px] font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3 h-3" /> Sandbox Execution Console
                </span>
                {status === 'success' && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> Passed
                  </span>
                )}
                {status === 'error' && (
                  <span className="flex items-center gap-1 text-rose-400">
                    <AlertCircle className="w-3 h-3" /> Error
                  </span>
                )}
              </div>
              <pre className="flex-1 p-3 text-xs font-mono text-slate-300 overflow-y-auto whitespace-pre-wrap select-text">
                {output || 'Click "Run Code" to compile and execute output...'}
              </pre>
            </div>
          </div>
        ) : (
          <WhiteboardCanvas onExport={(dataUri) => console.log('Whiteboard state updated')} />
        )}
      </div>
    </div>
  );
}