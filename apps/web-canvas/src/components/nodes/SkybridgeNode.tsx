import React, { useRef, useState, useCallback, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Puzzle, X, Maximize2, Minimize2, RefreshCw, Globe } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";
import { usePostMessageBridge } from "../../hooks/usePostMessageBridge";

export function SkybridgeNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isOverlayActive, setIsOverlayActive] = useState(false);

  const handlers = {
    updateData: (params: unknown) => { updateNode(id, { ...(params as Record<string, unknown>) }); return { ok: true }; },
    getData: () => nodeData,
  };
  usePostMessageBridge(iframeRef, handlers);

  const widgetUrl = nodeData.widgetUrl as string;
  const widgetHtml = nodeData.widgetHtml as string;

  const getIframeSrc = useCallback(() => {
    if (widgetUrl) return widgetUrl;
    if (widgetHtml) { return URL.createObjectURL(new Blob([widgetHtml], { type: "text/html" })); }
    const placeholder = `<!DOCTYPE html><html><head><style>
      body{margin:0;padding:24px;font-family:Inter,system-ui,sans-serif;background:#0a0a14;color:#4a5568;display:flex;align-items:center;justify-content:center;height:100vh;box-sizing:border-box}
      .ph{text-align:center}.ph svg{margin:0 auto 12px;opacity:0.3}p{font-size:11px;line-height:1.6}code{background:rgba(139,92,246,0.1);padding:2px 6px;border-radius:4px;font-size:10px;color:#a78bfa}
    </style></head><body><div class="ph">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
      <p>No widget loaded.<br/>Set <code>widgetUrl</code> or <code>widgetHtml</code> in node data.</p>
    </div></body></html>`;
    return URL.createObjectURL(new Blob([placeholder], { type: "text/html" }));
  }, [widgetUrl, widgetHtml]);

  useEffect(() => {
    const rf = document.querySelector(".react-flow");
    if (!rf) return;
    const on = () => setIsOverlayActive(true);
    const off = () => setIsOverlayActive(false);
    rf.addEventListener("pointerdown", on); rf.addEventListener("wheel", on);
    rf.addEventListener("pointerup", off);
    return () => { rf.removeEventListener("pointerdown", on); rf.removeEventListener("wheel", on); rf.removeEventListener("pointerup", off); };
  }, []);

  return (
    <div className={`glass-card rounded-2xl overflow-hidden node-skybridge animate-fade-in transition-all duration-300 ${isExpanded ? "w-[600px] h-[500px]" : "w-80 h-64"}`}>
      <Handle type="target" position={Position.Top} className="!bg-violet-500 !border-violet-400" />

      <div className="relative px-4 py-2.5 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 via-transparent to-purple-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Globe size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white/90">{nodeData.label || "Skybridge Widget"}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIframeKey(k => k + 1)} className="p-1.5 rounded-lg text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all" title="Reload">
              <RefreshCw size={11} />
            </button>
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-lg text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
              {isExpanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
            </button>
            <button onClick={() => deleteNode(id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <X size={11} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative" style={{ height: "calc(100% - 48px)" }}>
        <iframe ref={iframeRef} key={iframeKey} src={getIframeSrc()} className="w-full h-full border-0 rounded-b-2xl"
          sandbox="allow-scripts allow-same-origin allow-forms" title={nodeData.label as string} />
        {isOverlayActive && <div className="absolute inset-0 bg-transparent cursor-grab" style={{ pointerEvents: "auto" }} />}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !border-violet-400" />
    </div>
  );
}
