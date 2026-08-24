import React, { useRef, useState, useEffect, useCallback } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { X, Maximize2, Minimize2, RefreshCw, Globe, Send, Edit3, Target, Pencil } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";
import { usePostMessageBridge } from "../../hooks/usePostMessageBridge";

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

interface Annotation {
  id: string;
  type: "point" | "lasso";
  x: number;
  y: number;
  width?: number;
  height?: number;
  path?: string;
  comment: string;
}

export function SkybridgeNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string>("");
  const [isOverlayActive, setIsOverlayActive] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [annotationMode, setAnnotationMode] = useState<"off" | "lasso">("off");
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const [annotationComment, setAnnotationComment] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPath, setDrawPath] = useState<string>("");
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

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
      const placeholder = `<!DOCTYPE html><html><head><style>body{margin:0;padding:32px;font-family:Inter,sans-serif;background:#0a0a14;color:#4a5568;display:flex;align-items:center;justify-content:center;height:100vh}p{text-align:center;font-size:12px}</style></head><body><p>No widget loaded</p></body></html>`;
      const blob = new Blob([placeholder], { type: "text/html" });
      setIframeSrc(URL.createObjectURL(blob));
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

  // Lasso drawing handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (annotationMode !== "lasso") return;
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawPath(`M ${x} ${y}`);
  }, [annotationMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || annotationMode !== "lasso") return;
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawPath(prev => `${prev} L ${x} ${y}`);
  }, [isDrawing, annotationMode]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || annotationMode !== "lasso" || !drawStart) return;
    e.preventDefault();

    const rect = e.currentTarget.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    // Calculate bounding box
    const minX = Math.min(drawStart.x, endX);
    const minY = Math.min(drawStart.y, endY);
    const maxX = Math.max(drawStart.x, endX);
    const maxY = Math.max(drawStart.y, endY);
    const width = maxX - minX;
    const height = maxY - minY;

    // Only create annotation if area is significant
    if (width > 20 && height > 20) {
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      const newAnnotation: Annotation = {
        id: `ann-${Date.now()}`,
        type: "lasso",
        x: (minX / containerWidth) * 100,
        y: (minY / containerHeight) * 100,
        width: (width / containerWidth) * 100,
        height: (height / containerHeight) * 100,
        path: drawPath + ` L ${endX} ${endY} Z`,
        comment: "",
      };

      setAnnotations(prev => [...prev, newAnnotation]);
      setActiveAnnotation(newAnnotation.id);
      setShowEdit(true);
    }

    setIsDrawing(false);
    setDrawPath("");
    setDrawStart(null);
    setAnnotationMode("off");
  }, [isDrawing, drawStart, drawPath]);

  const submitAnnotation = (annotationId: string) => {
    if (!annotationComment.trim()) return;
    setAnnotations(prev => prev.map(a => a.id === annotationId ? { ...a, comment: annotationComment } : a));
    setActiveAnnotation(null);
    setAnnotationComment("");
  };

  const removeAnnotation = (annotationId: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== annotationId));
  };

  const handleEdit = async () => {
    let fullPrompt = editPrompt;

    if (annotations.length > 0) {
      const annotationContext = annotations
        .filter(a => a.comment)
        .map(a => {
          if (a.type === "lasso") {
            return `[Selected area at ${Math.round(a.x)}%, ${Math.round(a.y)}% spanning ${Math.round(a.width!)}% x ${Math.round(a.height!)}% of the card]: ${a.comment}`;
          }
          return `[Point at ${Math.round(a.x)}%, ${Math.round(a.y)}%]: ${a.comment}`;
        })
        .join("\n");

      if (annotationContext) {
        fullPrompt = `${editPrompt}\n\nSpecific feedback from annotations:\n${annotationContext}\n\nApply changes only to the elements within the annotated areas. Do not modify elements outside these areas.`;
      }
    }

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
            <button onClick={() => setAnnotationMode(annotationMode === "lasso" ? "off" : "lasso")}
              className={`p-2 rounded-lg transition-all ${annotationMode === "lasso" ? 'text-amber-400 bg-amber-500/20 animate-pulse' : 'text-slate-400 hover:text-amber-400 hover:bg-amber-500/10'}`}
              title="Lasso Select (draw area)">
              <Pencil size={14} />
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
              placeholder="Describe changes: 'make this section blue', 'add a table here'..."
              className="flex-1 px-3 py-2 text-[11px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/40"
              disabled={isEditing} />
            <button onClick={handleEdit} disabled={isEditing}
              className="px-3 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-400 hover:to-purple-500 disabled:opacity-30 transition-all flex items-center gap-1.5 shadow-lg shadow-violet-500/20">
              {isEditing ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
              <span className="text-[11px] font-medium">Send</span>
            </button>
          </div>

          {/* Annotations list */}
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
                        placeholder="What should change in this area?"
                        className="flex-1 px-2 py-1 text-[10px] bg-white/[0.03] border border-white/[0.06] rounded text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/40"
                        autoFocus />
                      <button onClick={() => submitAnnotation(ann.id)} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30">✓</button>
                      <button onClick={() => { removeAnnotation(ann.id); setActiveAnnotation(null); }} className="px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">✕</button>
                    </div>
                  ) : (
                    <>
                      <span className="text-slate-400 truncate flex-1">
                        {ann.type === "lasso" ? `Area ${Math.round(ann.width!)}%×${Math.round(ann.height!)}%` : "Point"}: {ann.comment || "Click to add comment..."}
                      </span>
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

        {/* SVG overlay for lasso drawing */}
        <svg ref={svgRef} className="absolute inset-0 w-full h-full z-10"
          style={{ pointerEvents: annotationMode === "lasso" ? "auto" : "none", cursor: annotationMode === "lasso" ? "crosshair" : "default" }}
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => { if (isDrawing) { setIsDrawing(false); setDrawPath(""); } }}>
          {/* Current drawing path */}
          {isDrawing && drawPath && (
            <path d={drawPath} fill="rgba(245, 158, 11, 0.1)" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
          )}

          {/* Saved annotation areas */}
          {annotations.filter(a => a.type === "lasso" && a.path).map((ann) => (
            <path key={ann.id} d={ann.path!}
              fill={activeAnnotation === ann.id ? "rgba(245, 158, 11, 0.15)" : "rgba(245, 158, 11, 0.08)"}
              stroke={activeAnnotation === ann.id ? "#f59e0b" : "#f59e0b80"}
              strokeWidth={activeAnnotation === ann.id ? "2" : "1"}
              strokeDasharray={activeAnnotation === ann.id ? "none" : "4 2"}
              className="cursor-pointer"
              onClick={() => { setActiveAnnotation(ann.id); setAnnotationComment(ann.comment); setShowEdit(true); }} />
          ))}
        </svg>

        {/* Annotation mode indicator */}
        {annotationMode === "lasso" && !isDrawing && (
          <div className="absolute top-3 left-3 z-20 px-3 py-2 bg-amber-500/20 backdrop-blur-sm text-amber-400 text-[11px] rounded-lg border border-amber-500/30 flex items-center gap-2">
            <Pencil size={12} />
            Click and drag to select an area
          </div>
        )}

        {isDrawing && (
          <div className="absolute top-3 left-3 z-20 px-3 py-2 bg-amber-500/30 backdrop-blur-sm text-amber-300 text-[11px] rounded-lg border border-amber-500/40">
            Drawing... release to finish
          </div>
        )}

        {isOverlayActive && <div className="absolute inset-0 bg-transparent cursor-grab" style={{ pointerEvents: "auto" }} />}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !border-violet-400 !w-3 !h-3" />
    </div>
  );
}
