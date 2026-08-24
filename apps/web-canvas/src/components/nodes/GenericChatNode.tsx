import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Send, Bot, User, Wrench, Loader2, X } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: Array<{ name: string; status: "running" | "done" | "error" }>;
}

export function GenericChatNode({ id, data }: NodeProps) {
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
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: input.trim() },
    ];
    updateNode(id, { messages: newMessages });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const statusColors = {
    idle: "bg-slate-500",
    running: "bg-blue-500 animate-pulse-soft",
    success: "bg-green-500",
    error: "bg-red-500",
  };

  return (
    <div className="w-80 bg-canvas-node border border-canvas-border rounded-xl shadow-2xl overflow-hidden">
      <Handle type="target" position={Position.Top} className="!bg-canvas-accent" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-canvas-border bg-white/5">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
          <span className="text-sm font-semibold text-slate-200">
            {nodeData.label || "Chat Agent"}
          </span>
        </div>
        <button
          onClick={() => deleteNode(id)}
          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="h-48 overflow-y-auto px-3 py-2 space-y-2">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            Start a conversation...
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role !== "user" && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Bot size={12} className="text-indigo-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] px-3 py-1.5 rounded-lg text-xs ${
                msg.role === "user"
                  ? "bg-canvas-accent text-white"
                  : "bg-white/5 text-slate-300"
              }`}
            >
              {msg.content}
              {msg.toolCalls?.map((tc, j) => (
                <div
                  key={j}
                  className="flex items-center gap-1 mt-1 text-[10px] text-slate-400"
                >
                  <Wrench size={10} />
                  <span>{tc.name}</span>
                  {tc.status === "running" && (
                    <Loader2 size={10} className="animate-spin" />
                  )}
                </div>
              ))}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                <User size={12} className="text-slate-400" />
              </div>
            )}
          </div>
        ))}
        {status === "running" && (
          <div className="flex items-center gap-2 text-xs text-blue-400">
            <Loader2 size={12} className="animate-spin" />
            <span>Thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-canvas-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-3 py-1.5 text-xs bg-white/5 border border-canvas-border rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-canvas-accent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2 bg-canvas-accent hover:bg-indigo-600 disabled:opacity-30 disabled:hover:bg-canvas-accent rounded-lg transition-colors"
          >
            <Send size={12} className="text-white" />
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-canvas-accent" />
    </div>
  );
}
