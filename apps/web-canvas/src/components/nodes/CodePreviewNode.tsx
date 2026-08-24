import React, { useState, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Code2, Play, Copy, Check, X, Terminal, Braces } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

export function CodePreviewNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);

  const [code, setCode] = useState((nodeData.code as string) || '// Write code here\nconsole.log("Hello!");');
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "output">("code");

  const handleRun = useCallback(() => {
    setIsRunning(true); setActiveTab("output"); setOutput("");
    const logs: string[] = [];
    const origLog = console.log, origErr = console.error, origWarn = console.warn;
    console.log = (...a) => { logs.push(a.map(x => typeof x === "object" ? JSON.stringify(x, null, 2) : String(x)).join(" ")); };
    console.error = (...a) => { logs.push("ERROR: " + a.map(x => typeof x === "object" ? JSON.stringify(x, null, 2) : String(x)).join(" ")); };
    console.warn = (...a) => { logs.push("WARN: " + a.map(x => typeof x === "object" ? JSON.stringify(x, null, 2) : String(x)).join(" ")); };
    try {
      const result = new Function(code)();
      if (result !== undefined) logs.push(`→ ${typeof result === "object" ? JSON.stringify(result, null, 2) : String(result)}`);
    } catch (err) { logs.push(`❌ ${err instanceof Error ? err.message : String(err)}`); }
    finally { console.log = origLog; console.error = origErr; console.warn = origWarn; }
    setOutput(logs.join("\n") || "(no output)"); setIsRunning(false);
  }, [code]);

  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="w-96 glass-card rounded-2xl overflow-hidden node-code animate-fade-in">
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !border-amber-400" />

      <div className="relative px-4 py-3 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Braces size={14} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white/90 block">{nodeData.label || "Code Preview"}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-300/70 rounded-md border border-amber-500/10">{String(nodeData.language || "javascript")}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleCopy} className="p-1.5 rounded-lg text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all" title="Copy">
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
            <button onClick={handleRun} disabled={isRunning} className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-30 transition-all" title="Run">
              <Play size={12} />
            </button>
            <button onClick={() => deleteNode(id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <X size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex border-b border-white/5">
        {(["code", "output"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-[11px] font-medium transition-all ${activeTab === tab
              ? "text-amber-300 border-b-2 border-amber-400 bg-amber-500/5" : "text-slate-600 hover:text-slate-400"}`}>
            {tab === "code" ? <Code2 size={11} className="inline mr-1" /> : <Terminal size={11} className="inline mr-1" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="h-48">
        {activeTab === "code" ? (
          <textarea value={code} onChange={(e) => { setCode(e.target.value); updateNode(id, { code: e.target.value }); }}
            className="w-full h-full p-3 bg-transparent text-[11px] font-mono text-amber-100/70 resize-none focus:outline-none placeholder-slate-700 leading-relaxed"
            placeholder="Write your code here..." spellCheck={false} />
        ) : (
          <pre className="w-full h-full p-3 overflow-auto text-[11px] font-mono text-slate-300 bg-black/20 leading-relaxed">
            {output ? output : <span className="text-slate-700">Click ▶ to run and see output here</span>}
          </pre>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !border-amber-400" />
    </div>
  );
}
