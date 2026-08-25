import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { X, Maximize2, Minimize2, RefreshCw, Globe, ExternalLink, ArrowLeft, ArrowRight, Home, Search } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

export function WebAppNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const updateNode = useCanvasStore((s) => s.updateNode);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [url, setUrl] = useState((nodeData.url as string) || "");
  const [currentUrl, setCurrentUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string>("");

  useEffect(() => {
    if (url) {
      setCurrentUrl(url);
      setIframeSrc(url);
    }
  }, [url]);

  const handleNavigate = (targetUrl: string) => {
    if (!targetUrl) return;
    // Add https:// if missing
    let finalUrl = targetUrl;
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }
    setUrl(finalUrl);
    setCurrentUrl(finalUrl);
    setIframeSrc(finalUrl);
    updateNode(id, { url: finalUrl });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNavigate(currentUrl);
    }
  };

  return (
    <div className={`glass-card rounded-2xl overflow-hidden node-webapp animate-fade-in transition-all duration-300 ${isExpanded ? "w-[900px] h-[700px]" : "w-[450px] min-h-[350px]"}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !border-blue-400 !w-3 !h-3" />

      {/* Browser header */}
      <div className="relative px-3 py-2 border-b border-white/5 bg-slate-900/50">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5" />
        <div className="relative flex items-center gap-2">
          {/* Window controls */}
          <div className="flex items-center gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 cursor-pointer" onClick={() => deleteNode(id)} />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)} />
            <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 cursor-pointer" onClick={() => setIframeSrc(currentUrl)} />
          </div>

          {/* Navigation buttons */}
          <button onClick={() => iframeRef.current?.contentWindow?.history.back()} className="p-1 text-slate-500 hover:text-white transition-colors">
            <ArrowLeft size={14} />
          </button>
          <button onClick={() => iframeRef.current?.contentWindow?.history.forward()} className="p-1 text-slate-500 hover:text-white transition-colors">
            <ArrowRight size={14} />
          </button>
          <button onClick={() => setIframeSrc(currentUrl)} className="p-1 text-slate-500 hover:text-white transition-colors">
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => handleNavigate("https://google.com")} className="p-1 text-slate-500 hover:text-white transition-colors">
            <Home size={14} />
          </button>

          {/* URL bar */}
          <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-lg">
            <Search size={12} className="text-slate-500" />
            <input
              type="text"
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter URL..."
              className="flex-1 bg-transparent text-[11px] text-slate-200 placeholder-slate-600 focus:outline-none"
            />
          </div>

          {/* Expand/collapse */}
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative" style={{ height: "calc(100% - 44px)" }}>
        {iframeSrc ? (
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-top-navigation allow-presentation"
            allow="clipboard-read; clipboard-write; microphone; camera; fullscreen"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-b from-blue-500/5 to-transparent">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Globe size={32} className="text-blue-500/30" />
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-300 mb-2">Enter a URL to open any website</p>
              <p className="text-[10px] text-slate-600 mb-4">Gmail, Hermes, YouTube, or any web app</p>
              <div className="flex gap-2 flex-wrap justify-center">
                {[
                  { label: "Gmail", url: "https://mail.google.com" },
                  { label: "YouTube", url: "https://youtube.com" },
                  { label: "GitHub", url: "https://github.com" },
                  { label: "Google", url: "https://google.com" },
                ].map((preset) => (
                  <button key={preset.label} onClick={() => handleNavigate(preset.url)}
                    className="px-3 py-1.5 text-[10px] bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors border border-blue-500/20">
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !border-blue-400 !w-3 !h-3" />
    </div>
  );
}
