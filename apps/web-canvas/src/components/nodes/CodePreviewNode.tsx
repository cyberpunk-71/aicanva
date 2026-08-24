import React, { useState, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Code2, Play, Copy, Check, X, Terminal } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

export function CodePreviewNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);

  const [code, setCode] = useState(
    (nodeData.code as string) || '// Write code here\nconsole.log("Hello!");'
  );
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "output">("code");

  const handleRun = useCallback(() => {
    setIsRunning(true);
    setActiveTab("output");
    setOutput("");

    // Capture console.log output
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      logs.push(
        args
          .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
          .join(" ")
      );
    };
    console.error = (...args) => {
      logs.push(
        "ERROR: " +
          args
            .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
            .join(" ")
      );
    };
    console.warn = (...args) => {
      logs.push(
        "WARN: " +
          args
            .map((a) => (typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)))
            .join(" ")
      );
    };

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function(code);
      const result = fn();
      if (result !== undefined) {
        logs.push(`→ ${typeof result === "object" ? JSON.stringify(result, null, 2) : String(result)}`);
      }
    } catch (err) {
      logs.push(`❌ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }

    setOutput(logs.join("\n") || "(no output)");
    setIsRunning(false);
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    updateNode(id, { code: e.target.value });
  };

  return (
    <div className="w-96 bg-canvas-node border border-canvas-border rounded-xl shadow-2xl overflow-hidden">
      <Handle type="target" position={Position.Top} className="!bg-amber-500" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-canvas-border bg-amber-500/10">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-amber-400" />
          <span className="text-sm font-semibold text-slate-200">
            {nodeData.label || "Code Preview"}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded">
            {nodeData.language || "javascript"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
            title="Copy code"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          </button>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="p-1 text-slate-500 hover:text-green-400 disabled:opacity-50 transition-colors"
            title="Run code"
          >
            <Play size={12} />
          </button>
          <button
            onClick={() => deleteNode(id)}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-canvas-border">
        <button
          onClick={() => setActiveTab("code")}
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "code"
              ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Code2 size={12} className="inline mr-1" />
          Code
        </button>
        <button
          onClick={() => setActiveTab("output")}
          className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "output"
              ? "text-amber-400 border-b-2 border-amber-400 bg-amber-500/5"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Terminal size={12} className="inline mr-1" />
          Output
        </button>
      </div>

      {/* Content */}
      <div className="h-48">
        {activeTab === "code" ? (
          <textarea
            value={code}
            onChange={handleCodeChange}
            className="w-full h-full p-3 bg-transparent text-xs font-mono text-slate-300 resize-none focus:outline-none placeholder-slate-600"
            placeholder="Write your code here..."
            spellCheck={false}
          />
        ) : (
          <pre className="w-full h-full p-3 overflow-auto text-xs font-mono text-slate-300 bg-black/20">
            {output ? output : <span className="text-slate-600">Click ▶ to run and see output here</span>}
          </pre>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
    </div>
  );
}
