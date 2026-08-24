import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Send, Bot, User, Wrench, Loader2, X, Maximize2, Minimize2, Copy, Check, Zap, RotateCcw, FileCode } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: Array<{ name: string; status: "running" | "done" | "error" }>;
  timestamp?: string;
}

export function GenericChatNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const messages = (nodeData.messages as Message[]) || [];
  const status = nodeData.status || "idle";
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);

  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendToHermes = async (userMessage: string) => {
    setIsStreaming(true);
    updateNode(id, { status: "running" });

    // Add user message
    const userMsg: Message = { role: "user", content: userMessage, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    updateNode(id, { messages: updatedMessages });

    // Add placeholder for assistant response
    const assistantMsg: Message = { role: "assistant", content: "", timestamp: new Date().toISOString() };
    updateNode(id, { messages: [...updatedMessages, assistantMsg] });

    try {
      const response = await fetch(`${API_URL}/api/hermes/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: `You are Hermes, an AI assistant on a canvas workspace. The user is interacting with you through a chat card. Be concise and helpful. Current canvas has ${useCanvasStore.getState().nodes.length} nodes.`,
          node_id: id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const msg = JSON.parse(line.slice(6));
              if (msg.type === "chunk") {
                fullContent += msg.content;
                const currentMessages = useCanvasStore.getState().nodes.find(n => n.id === id)?.data.messages as Message[] || [];
                const updated = [...currentMessages];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                updateNode(id, { messages: updated });
              } else if (msg.type === "message") {
                fullContent = msg.content;
                const currentMessages = useCanvasStore.getState().nodes.find(n => n.id === id)?.data.messages as Message[] || [];
                const updated = [...currentMessages];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                updateNode(id, { messages: updated });
              } else if (msg.type === "auto_card") {
                // Hermes created an HTML file — auto-create a skybridge card
                const store = useCanvasStore.getState();
                const myNode = store.nodes.find(n => n.id === id);
                const pos = myNode ? { x: myNode.position.x + 450, y: myNode.position.y } : undefined;
                const cardId = store.addNode("skybridge", pos);
                store.updateNode(cardId, {
                  label: msg.filename || "Hermes Output",
                  widgetHtml: msg.html,
                });
                // Auto-link
                store.onConnect({ source: id, target: cardId, sourceHandle: null, targetHandle: null });
              } else if (msg.type === "error") {
                fullContent = msg.content || "Error connecting to Hermes";
                const currentMessages = useCanvasStore.getState().nodes.find(n => n.id === id)?.data.messages as Message[] || [];
                const updated = [...currentMessages];
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                updateNode(id, { messages: updated });
              }
            } catch {}
          }
        }
      }

      updateNode(id, { status: "success" });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      const currentMessages = useCanvasStore.getState().nodes.find(n => n.id === id)?.data.messages as Message[] || [];
      const updated = [...currentMessages];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content: `⚠️ Could not reach Hermes: ${errorMsg}\n\nMake sure Hermes gateway is running on port 8080.`,
      };
      updateNode(id, { messages: updated, status: "error" });
    } finally {
      setIsStreaming(false);
      setTimeout(() => updateNode(id, { status: "idle" }), 2000);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const msg = input.trim();
    setInput("");
    sendToHermes(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  };

  const statusConfig = {
    idle: { dot: "bg-slate-500", label: "Ready", glow: "" },
    running: { dot: "bg-blue-400", label: "Hermes is thinking...", glow: "shadow-[0_0_8px_rgba(59,130,246,0.5)]" },
    success: { dot: "bg-emerald-400", label: "Response received", glow: "shadow-[0_0_8px_rgba(34,197,94,0.5)]" },
    error: { dot: "bg-red-400", label: "Connection error", glow: "shadow-[0_0_8px_rgba(239,68,68,0.5)]" },
  };
  const cfg = statusConfig[status] || statusConfig.idle;

  return (
    <div className={`glass-card rounded-2xl overflow-hidden node-chat animate-fade-in transition-all duration-300 ${isExpanded ? "w-[560px] h-[650px]" : "w-[400px] min-h-[350px]"}`}>
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !border-indigo-400 !w-3 !h-3" />

      {/* Header */}
      <div className="relative px-4 py-3 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-violet-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Zap size={18} className="text-white" />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${cfg.dot} border-2 border-[#0f0f1e] ${cfg.glow}`} />
            </div>
            <div>
              <span className="text-sm font-semibold text-white/90 block">{nodeData.label || "Hermes Chat"}</span>
              <span className="text-[10px] text-slate-500">{cfg.label} · {messages.length} messages</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={async () => {
              // List recent HTML files and let user pick
              try {
                const res = await fetch(`${API_URL}/api/hermes/files`);
                const data = await res.json();
                if (data.files && data.files.length > 0) {
                  const latest = data.files[0];
                  const cardRes = await fetch(`${API_URL}/api/hermes/create-card`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ filepath: latest.path }),
                  });
                  const cardData = await cardRes.json();
                  if (cardData.ok) {
                    const store = useCanvasStore.getState();
                    const myNode = store.nodes.find(n => n.id === id);
                    const pos = myNode ? { x: myNode.position.x + 450, y: myNode.position.y } : undefined;
                    const cardId = store.addNode("skybridge", pos);
                    store.updateNode(cardId, { label: cardData.filename, widgetHtml: cardData.html });
                    store.onConnect({ source: id, target: cardId, sourceHandle: null, targetHandle: null });
                  }
                }
              } catch {}
            }} className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Load Latest HTML">
              <FileCode size={13} />
            </button>
            <button onClick={() => {
              fetch(`${API_URL}/api/hermes/new-session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ node_id: id }),
              });
              updateNode(id, { messages: [], status: "idle" });
            }} className="p-1.5 rounded-lg text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all" title="New Session">
              <RotateCcw size={13} />
            </button>
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
      <div className="overflow-y-auto px-4 py-3 space-y-3" style={{ height: "calc(100% - 140px)", minHeight: "150px" }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <Zap size={28} className="text-indigo-500/30" />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-slate-400">Chat with Hermes</p>
              <p className="text-[10px] text-slate-600 mt-1">Ask anything — code, research, analysis, actions</p>
              <p className="text-[10px] text-slate-700 mt-1">Hermes can create cards, run code, and more</p>
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
            <div className={`max-w-[85%] relative`}>
              <div className={`px-4 py-3 rounded-2xl text-[12px] leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 rounded-br-md"
                  : "bg-white/[0.04] text-slate-200 border border-white/[0.06] rounded-bl-md"
              }`}>
                {msg.content || (isStreaming && i === messages.length - 1 ? (
                  <div className="flex gap-1 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : null)}
                {msg.toolCalls?.map((tc, j) => (
                  <div key={j} className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400 bg-white/[0.03] rounded-lg px-2 py-1">
                    <Wrench size={9} />
                    <span>{tc.name}</span>
                    {tc.status === "running" && <Loader2 size={9} className="animate-spin text-blue-400" />}
                    {tc.status === "done" && <span className="text-emerald-400">✓</span>}
                  </div>
                ))}
              </div>
              {msg.role === "assistant" && msg.content && (
                <button onClick={() => handleCopy(msg.content, i)}
                  className="absolute -right-2 -top-2 p-1.5 rounded-lg bg-white/10 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 transition-all border border-white/5">
                  {copiedIdx === i ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                </button>
              )}
              {msg.timestamp && (
                <span className="text-[9px] text-slate-700 mt-1 block px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center mt-0.5">
                <User size={12} className="text-slate-500" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex gap-2 items-end">
          <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "Hermes is responding..." : "Ask Hermes anything..."} rows={1} disabled={isStreaming}
            className="flex-1 px-4 py-2.5 text-[12px] bg-white/[0.03] border border-white/[0.06] rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/40 focus:bg-white/[0.05] transition-all resize-none min-h-[40px] max-h-[100px] disabled:opacity-50"
            onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 100) + "px"; }} />
          <button onClick={handleSend} disabled={!input.trim() || isStreaming}
            className="p-2.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 disabled:opacity-20 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 active:scale-95 flex-shrink-0">
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !border-indigo-400 !w-3 !h-3" />
    </div>
  );
}
