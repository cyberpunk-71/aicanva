import React, { useRef, useState, useCallback, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Puzzle, X, Maximize2, Minimize2, RefreshCw } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";
import { usePostMessageBridge } from "../../hooks/usePostMessageBridge";

export function SkybridgeNode({ id, data }: NodeProps) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [isOverlayActive, setIsOverlayActive] = useState(false);

  // Handlers for messages from the iframe
  const handlers = {
    updateData: (params: unknown) => {
      updateNode(id, { ...(params as Record<string, unknown>) });
      return { ok: true };
    },
    getData: () => {
      return nodeData;
    },
  };

  const { call, notify } = usePostMessageBridge(iframeRef, handlers);

  // Create blob URL for the widget content
  const widgetUrl = nodeData.widgetUrl as string;
  const widgetHtml = nodeData.widgetHtml as string;

  const getIframeSrc = useCallback(() => {
    if (widgetUrl) return widgetUrl;
    if (widgetHtml) {
      const blob = new Blob([widgetHtml], { type: "text/html" });
      return URL.createObjectURL(blob);
    }
    // Default placeholder
    const placeholder = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Inter, system-ui, sans-serif;
              background: #12121e;
              color: #94a3b8;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              box-sizing: border-box;
            }
            .placeholder {
              text-align: center;
            }
            .placeholder svg { margin: 0 auto 12px; opacity: 0.5; }
            .placeholder p { font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <p>No Skybridge widget loaded.<br/>Set <code>widgetUrl</code> or <code>widgetHtml</code> in node data.</p>
          </div>
        </body>
      </html>
    `;
    const blob = new Blob([placeholder], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [widgetUrl, widgetHtml]);

  // Pointer-events overlay: when canvas is being panned/zoomed,
  // we place a transparent overlay over the iframe to prevent it from capturing events
  useEffect(() => {
    const handleCanvasInteraction = (e: Event) => {
      if (e.type === "pointerdown" || e.type === "wheel") {
        setIsOverlayActive(true);
      }
    };
    const handleCanvasInteractionEnd = () => {
      setIsOverlayActive(false);
    };

    // Listen on the ReactFlow container
    const rfContainer = document.querySelector(".react-flow");
    if (rfContainer) {
      rfContainer.addEventListener("pointerdown", handleCanvasInteraction);
      rfContainer.addEventListener("wheel", handleCanvasInteraction);
      rfContainer.addEventListener("pointerup", handleCanvasInteractionEnd);
    }

    return () => {
      if (rfContainer) {
        rfContainer.removeEventListener("pointerdown", handleCanvasInteraction);
        rfContainer.removeEventListener("wheel", handleCanvasInteraction);
        rfContainer.removeEventListener("pointerup", handleCanvasInteractionEnd);
      }
    };
  }, []);

  return (
    <div
      className={`bg-canvas-node border border-canvas-border rounded-xl shadow-2xl overflow-hidden transition-all duration-200 ${
        isExpanded ? "w-[600px] h-[500px]" : "w-80 h-64"
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-violet-500" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-canvas-border bg-violet-500/10">
        <div className="flex items-center gap-2">
          <Puzzle size={14} className="text-violet-400" />
          <span className="text-sm font-semibold text-slate-200">
            {nodeData.label || "Skybridge Widget"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-1 text-slate-500 hover:text-violet-400 transition-colors"
            title="Reload"
          >
            <RefreshCw size={12} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-500 hover:text-violet-400 transition-colors"
            title={isExpanded ? "Minimize" : "Maximize"}
          >
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
          <button
            onClick={() => deleteNode(id)}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Iframe container */}
      <div className="relative flex-1" style={{ height: "calc(100% - 40px)" }}>
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={getIframeSrc()}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms"
          title={nodeData.label as string}
        />
        {/* Pointer-events overlay for canvas pan/zoom */}
        {isOverlayActive && (
          <div
            className="absolute inset-0 bg-transparent cursor-grab"
            style={{ pointerEvents: "auto" }}
          />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-violet-500" />
    </div>
  );
}
