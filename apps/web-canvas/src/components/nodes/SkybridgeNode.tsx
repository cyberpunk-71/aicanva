import React, { useRef, useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { X, Maximize2, Minimize2, RefreshCw, Globe, Send, Edit3, Target } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";
import { usePostMessageBridge } from "../../hooks/usePostMessageBridge";

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

interface Annotation {
  id: string;
  x: number;
  y: number;
  comment: string;
}

export function SkybridgeNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string>("");
  const [isOverlayActive, setIsOverlayActive] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const [annotationComment, setAnnotationComment] = useState("");

  const handlers = {
    updateData: (params: unknown) => { updateNode(id, { ...(params as Record<string, unknown>) }); return { ok: true }; },
    getData: () => nodeData,
  };
  usePostMessageBridge(iframeRef, handlers);

  useEffect(() => {
    const widgetUrl = nodeData.widgetUrl as string;
    const widgetHtml = nodeData.widgetHtml as string;

    if (widgetUrl) {
      setIframeSrc(widgetUrl);
    } else if (widgetHtml) {
      const blob = new Blob([widgetHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      setIframeSrc(url);
      return () => URL.revokeObjectURL(url);
    } else {
      const placeholder = `<!DOCTYPE html><html><head><style>
        body{margin:0;padding:32px;font-family:Inter,system-ui,sans-serif;background:#0a0a14;color:#4a5568;display:flex;align-items:center;justify-content:center;height:100vh;box-sizing:border-box}
        .ph{text-align:center}p{font-size:12px;line-height:1.8}code{background:rgba(139,92,246,0.1);padding:2px 8px;border-radius:4px;font-size:11px;color:#a78bfa}
      </style></head><body><div class="ph">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.5" style="margin:0 auto 16px;opacity:0.3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
        <p>No widget loaded.</p>
      </div></body></html>`;
      const blob = new Blob([placeholder], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      setIframeSrc(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [nodeData.widgetUrl, nodeData.widgetHtml]);

  useEffect(() => {
    const rf = document.querySelector(".react-flow");
    if (!rf) return;
    const on = () => setIsOverlayActive(true);
    const off = () => setIsOverlayActive(false);
    rf.addEventListener("pointerdown", on); rf.addEventListener("wheel", on); rf.addEventListener("pointerup", off);
    return () => { rf.removeEventListener("pointerdown", on); rf.removeEventListener("wheel", on); rf.removeEventListener("pointerup", off); };
  }, []);

  const handleAnnotationClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAnnotating) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newAnnotation: Annotation = { id: `ann-${Date.now()}`, x, y, comment: "" };
    setAnnotations([...annotations, newAnnotation]);
    setActiveAnnotation(newAnnotation.id);
    setIsAnnotating(false);
    setShowEdit(true);
  };

  const submitAnnotation = (annotationId: string) => {
    if (!annotationComment.trim()) return;
    setAnnotations(annotations.map(a => a.id === annotationId ? { ...a, comment: annotationComment } : a));
    setActiveAnnotation(null);
    setAnnotationComment("");
  };

  const removeAnnotation = (annotationId: string) => {
    setAnnotations(annotations.filter(a => a.id !== annotationId));
  };

  const handleEdit = async () => {
    let fullPrompt = editPrompt;
    const annotationFeedback = annotations.filter(a => a.comment).map(a => `[Area at ${Math.round(a.x)}%, ${Math.round(a.y)}%]: ${a.comment}`).join("\n");
    if (annotationFeedback) fullPrompt = `${editPrompt}\n\nSpecific feedback:\n${annotationFeedback}`;
    if (!fullPrompt.trim()) return;

    setIsEditing(true);
    try {
      const response = await fetch(`${API_URL}/api/hermes/edit-html`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: nodeData.label, instruction: fullPrompt, node_id: id }),
      });

      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
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
              if (msg.type === "auto_card" && msg.html) updateNode(id, { widgetHtml: msg.html });
            } catch {}
          }
        }
      }
      setAnnotations([]);
    } catch (err) {
      console.error("Edit failed:", err);
    } finally {
      setIsEditing(false);
      setEditPrompt("");
    }
  };

  return (
    <div className={`glass-card rounded-2xl overflow-hidden node-skybridge animate-fade-in transition-all duration-300 ${isExpanded ? "w-[700px] h-[600px]" : "w-[400px] min-h-[300px]"}`}>
      <Handle type="target" position={Position.Top} className="!bg-violet-500 !border-violet-400 !w-3 !h-3" />

      {/* Header */}
      <div className="relative px-4 py-3 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-purple-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Globe size={16} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white/90">{nodeData.label || "Skybridge Widget"}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowEdit(!showEdit)} className={`p-2 rounded-lg transition-all ${showEdit ? 'text-violet-400 bg-violet-500/20' : 'text-slate-400 hover:text-violet-400 hover:bg-violet-500/10'}`} title="Edit with Hermes">
              <Edit3 size={14} />
            </button>
            <button onClick={() => setIsAnnotating(!isAnnotating)} className={`p-2 rounded-lg transition-all ${isAnnotating ? 'text-amber-400 bg-amber-500/20 animate-pulse' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'}`} title="Annotate">
              <Target size={14} />
            </button>
            <button onClick={() => { if (nodeData.widgetHtml) { const blob = new Blob([nodeData.widgetHtml as string], { type: "text/html" }); setIframeSrc(URL.createObjectURL(blob)); } }} className="p-2 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all"><RefreshCw size={12} /></button>
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
              {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <button onClick={() => deleteNode(id)} className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><X size={12} /></button>
          </div>
        </div>
      </div>

      {/* Edit panel */}
      {showEdit && (
        <div className="px-3 py-2 border-b border-white/5 bg-white/[0.02]">
          <div className="flex gap-2 mb-2">
            <input type="text" value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleEdit(); }}
              placeholder="Describe changes: 'make header blue', 'add chart', 'change layout'..."
              className="flex-1 px-3 py-2 text-[11px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/40"
              disabled={isEditing} />
            <button onClick={handleEdit} disabled={isEditing}
              className="px-3 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-400 hover:to-purple-500 disabled:opacity-30 transition-all flex items-center gap-1.5 shadow-lg shadow-violet-500/20">
              {isEditing ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              <span className="text-[11px] font-medium">Send</span>
            </button>
          </div>

          {/* Annotations */}
          {annotations.length > 0 && (
            <div className="space-y-1.5 max-h-24 overflow-y-auto">
              {annotations.map((ann, i) => (
                <div key={ann.id} className="flex items-center gap-2 text-[10px]">
                  <div className="w-5 h-5 rounded-full bg-amber-500/30 border border-amber-500/50 flex items-center justify-center text-amber-400 text-[9px] font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  {activeAnnotation === ann.id ? (
                    <div className="flex-1 flex gap-1">
                      <input type="text" value={annotationComment} onChange={(e) => setAnnotationComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") submitAnnotation(ann.id); }}
                        placeholder="What should change here?"
                        className="flex-1 px-2 py-1 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                        autoFocus />
                      <button onClick={() => submitAnnotation(ann.id)} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30">✓</button>
                      <button onClick={() => { removeAnnotation(ann.id); setActiveAnnotation(null); }} className="px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">✕</button>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-400 truncate flex-1">{ann.comment || "Click to add comment..."}</span>
                      <button onClick={() => { setActiveAnnotation(ann.id); setAnnotationComment(ann.comment); }} className="text-slate-600 hover:text-amber-400 p-0.5"><Edit3 size={10} /></button>
                      <button onClick={() => removeAnnotation(ann.id)} className="text-slate-600 hover:text-red-400 p-0.5"><X size={10} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Iframe with annotation overlay */}
      <div className="relative" style={{ height: showEdit ? `calc(100% - ${annotations.length > 0 ? 140 : 100}px)` : "calc(100% - 56px)" }}>
        {iframeSrc ? (
          <iframe ref={iframeRef} src={iframeSrc} className="w-full h-full border-0 rounded-b-2xl"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-top-navigation"
            title={nodeData.label as string} allow="clipboard-read; clipboard-write" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">Loading...</div>
        )}

        {/* Annotation click overlay */}
        {isAnnotating && (
          <div className="absolute inset-0 cursor-crosshair bg-amber-500/5 border-2 border-dashed border-amber-500/30 rounded-b-2xl z-10"
            onClick={handleAnnotationClick}>
            <div className="absolute top-3 left-3 px-2.5 py-1.5 bg-amber-500/20 backdrop-blur-sm text-amber-400 text-[10px] rounded-lg border border-amber-500/30">
              🎯 Click on the area you want to change
            </div>
          </div>
        )}

        {/* Annotation markers */}
        {annotations.map((ann, i) => (
          <div key={ann.id} className="absolute z-20 -ml-3 -mt-3 cursor-pointer group"
            style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
            onClick={() => { setActiveAnnotation(ann.id); setAnnotationComment(ann.comment); setShowEdit(true); }}>
            <div className="w-6 h-6 rounded-full bg-amber-500 border-2 border-amber-300 flex items-center justify-center text-[10px] font-bold text-black shadow-lg shadow-amber-500/50 group-hover:scale-125 transition-transform">
              {i + 1}
            </div>
            {ann.comment && (
              <div className="absolute left-8 top-0 bg-slate-800 text-slate-200 text-[10px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {ann.comment}
              </div>
            )}
          </div>
        ))}

        {isOverlayActive && <div className="absolute inset-0 bg-transparent cursor-grab" style={{ pointerEvents: "auto" }} />}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !border-violet-400 !w-3 !h-3" />
    </div>
  );
}
