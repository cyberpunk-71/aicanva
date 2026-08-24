import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Send, Bot, User, Wrench, Loader2, X, Sparkles } from "lucide-react";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessages: Message[] = [...messages, { role: "user", content: input.trim() }];
    updateNode(id, { messages: newMessages });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const statusConfig = {
    idle: { dot: "bg-slate-500", label: "Idle", glow: "" },
    running: { dot: "bg-blue-400", label: "Thinking...", glow: "shadow-[0_0_8px_rgba(59,130,246,0.5)]" },
    success: { dot: "bg-emerald-400", label: "Done", glow: "shadow-[0_0_8px_rgba(34,197,94,0.5)]" },
    error: { dot: "bg-red-400", label: "Error", glow: "shadow-[0_0_8px_rgba(239,68,68,0.5)]" },
  };

  const cfg = statusConfig[status] || statusConfig.idle;

  return (
    <div className="w-80 glass-card rounded-2xl overflow-hidden node-chat animate-fade-in">
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !border-indigo-400" />

      {/* Header */}
      <div className="relative px-4 py-3 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-violet-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${cfg.dot} border-2 border-[#0f0f1e] ${cfg.glow}`} />
            </div>
            <div>
              <span className="text-sm font-semibold text-white/90 block">{nodeData.label || "Chat Agent"}</span>
              <span className="text-[10px] text-slate-500">{cfg.label}</span>
            </div>
          </div>
          <button onClick={() => deleteNode(id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="h-48 overflow-y-auto px-3 py-2.5 space-y-2.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
            <Bot size={24} className="text-indigo-500/30" />
            <span className="text-xs">Start a conversation...</span>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
            {msg.role !== "user" && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/15 flex items-center justify-center mt-0.5">
                <Bot size={11} className="text-indigo-400" />
              </div>
            )}
            <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              msg.role === "user"
                ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "bg-white/[0.04] text-slate-300 border border-white/[0.06]"
            }`}>
              {msg.content}
              {msg.toolCalls?.map((tc, j) => (
                <div key={j} className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-400">
                  <Wrench size={9} />
                  <span>{tc.name}</span>
                  {tc.status === "running" && <Loader2 size={9} className="animate-spin text-blue-400" />}
                  {tc.status === "done" && <span className="text-emerald-400">✓</span>}
                </div>
              ))}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center mt-0.5">
                <User size={11} className="text-slate-500" />
              </div>
            )}
          </div>
        ))}
        {status === "running" && (
          <div className="flex items-center gap-2 text-xs text-blue-400/80 animate-fade-in">
            <div className="flex gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-white/5">
        <div className="flex gap-2">
          <input
            type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-xs bg-white/[0.03] border border-white/[0.06] rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all"
          />
          <button onClick={handleSend} disabled={!input.trim()}
            className="p-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-20 disabled:hover:from-indigo-500 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-95">
            <Send size={12} className="text-white" />
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !border-indigo-400" />
    </div>
  );
}
