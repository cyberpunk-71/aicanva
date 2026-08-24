import React, { useState, useRef, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps, useReactFlow } from "@xyflow/react";
import { Send, Bot, User, Wrench, Loader2, X, Sparkles, Maximize2, Minimize2, Copy, Check } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: Array<{ name: string; status: "running" | "done" | "error" }>;
}

export function GenericChatNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const messages = (nodeData.messages as Message[]) || [];
  const status = nodeData.status || "idle";
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);

  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessages: Message[] = [...messages, { role: "user", content: input.trim() }];
    updateNode(id, { messages: newMessages });
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const statusConfig = {
    idle: { dot: "bg-slate-500", label: "Ready", glow: "" },
    running: { dot: "bg-blue-400", label: "Thinking...", glow: "shadow-[0_0_8px_rgba(59,130,246,0.5)]" },
    success: { dot: "bg-emerald-400", label: "Done", glow: "shadow-[0_0_8px_rgba(34,197,94,0.5)]" },
    error: { dot: "bg-red-400", label: "Error", glow: "shadow-[0_0_8px_rgba(239,68,68,0.5)]" },
  };
  const cfg = statusConfig[status] || statusConfig.idle;

  return (
    <div className={`glass-card rounded-2xl overflow-hidden node-chat animate-fade-in transition-all duration-300 ${isExpanded ? "w-[520px] h-[600px]" : "w-[380px] min-h-[300px]"}`}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !border-indigo-400 !w-3 !h-3" />

      {/* Header */}
      <div className="relative px-4 py-3 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-violet-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles size={16} className="text-white" />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${cfg.dot} border-2 border-[#0f0f1e] ${cfg.glow}`} />
            </div>
            <div>
              <span className="text-sm font-semibold text-white/90 block">{nodeData.label || "Hermes Chat"}</span>
              <span className="text-[10px] text-slate-500">{cfg.label} · {messages.length} messages</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
              {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button onClick={() => deleteNode(id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <X size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="overflow-y-auto px-4 py-3 space-y-3" style={{ height: isExpanded ? "calc(100% - 130px)" : "calc(100% - 130px)", minHeight: "150px" }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <Bot size={24} className="text-indigo-500/30" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-slate-500">Start a conversation with Hermes</p>
              <p className="text-[10px] text-slate-700 mt-1">Ask anything — code, research, analysis</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in group`}>
            {msg.role !== "user" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center mt-0.5">
                <Bot size={12} className="text-indigo-400" />
              </div>
            )}
            <div className={`max-w-[85%] relative ${msg.role === "user" ? "order-1" : ""}`}>
              <div className={`px-3.5 py-2.5 rounded-2xl text-[12px] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 rounded-br-md"
                  : "bg-white/[0.04] text-slate-300 border border-white/[0.06] rounded-bl-md"
              }`}>
                {msg.content}
                {msg.toolCalls?.map((tc, j) => (
                  <div key={j} className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 bg-white/[0.03] rounded-lg px-2 py-1">
                    <Wrench size={9} />
                    <span>{tc.name}</span>
                    {tc.status === "running" && <Loader2 size={9} className="animate-spin text-blue-400" />}
                    {tc.status === "done" && <span className="text-emerald-400">✓</span>}
                  </div>
                ))}
              </div>
              {/* Copy button */}
              {msg.role === "assistant" && (
                <button onClick={() => handleCopy(msg.content, i)}
                  className="absolute -right-1 -top-1 p-1 rounded-md bg-white/5 text-slate-600 hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all">
                  {copiedIdx === i ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center mt-0.5">
                <User size={12} className="text-slate-500" />
              </div>
            )}
          </div>
        ))}
        {status === "running" && (
          <div className="flex items-center gap-2.5 animate-fade-in">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <Bot size={12} className="text-indigo-400" />
            </div>
            <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex gap-2 items-end">
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask Hermes anything..." rows={1}
            className="flex-1 px-3.5 py-2.5 text-[12px] bg-white/[0.03] border border-white/[0.06] rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all resize-none min-h-[38px] max-h-[100px]"
            style={{ height: "auto" }}
            onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 100) + "px"; }} />
          <button onClick={handleSend} disabled={!input.trim()}
            className="p-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-20 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-95 flex-shrink-0">
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !border-indigo-400 !w-3 !h-3" />
    </div>
  );
}
