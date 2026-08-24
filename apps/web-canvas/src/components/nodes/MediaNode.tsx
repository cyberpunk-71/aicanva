import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { X, Maximize2, Minimize2, Play, Pause, Volume2, VolumeX, Radio, Video, Music } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

export function MediaNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [mediaUrl, setMediaUrl] = useState((nodeData.mediaUrl as string) || "");
  const [mediaType, setMediaType] = useState<"video" | "audio" | "stream">((nodeData.mediaType as "video" | "audio" | "stream") || "video");
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);

  const togglePlay = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className={`glass-card rounded-2xl overflow-hidden node-media animate-fade-in transition-all duration-300 ${isExpanded ? "w-[640px] h-[480px]" : "w-[400px] min-h-[280px]"}`}>
      <Handle type="target" position={Position.Top} className="!bg-pink-500 !border-pink-400 !w-3 !h-3" />

      {/* Header */}
      <div className="relative px-4 py-3 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-transparent to-rose-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              {mediaType === "video" ? <Video size={16} className="text-white" /> : mediaType === "audio" ? <Music size={16} className="text-white" /> : <Radio size={16} className="text-white" />}
            </div>
            <div>
              <span className="text-sm font-semibold text-white/90 block">{nodeData.label || "Media Player"}</span>
              <span className="text-[10px] text-slate-500">{mediaType} • {isPlaying ? "Playing" : "Paused"}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-lg text-slate-500 hover:text-pink-400 hover:bg-pink-500/10 transition-all">
              {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <button onClick={() => deleteNode(id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><X size={12} /></button>
          </div>
        </div>
      </div>

      {/* Media content */}
      <div className="relative" style={{ height: "calc(100% - 56px)" }}>
        {mediaUrl ? (
          <>
            {mediaType === "video" || mediaType === "stream" ? (
              <video ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={mediaUrl}
                className="w-full h-full object-contain bg-black"
                autoPlay={false}
                muted={isMuted}
                loop
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)} />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-pink-500/5 to-transparent">
                <audio ref={mediaRef as React.RefObject<HTMLAudioElement>}
                  src={mediaUrl}
                  muted={isMuted}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)} />
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center mb-4">
                  <Music size={40} className="text-pink-400" />
                </div>
                <span className="text-sm text-slate-300">{nodeData.label || "Audio"}</span>
              </div>
            )}

            {/* Controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all">
                  {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
                </button>
                <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: "30%" }} />
                </div>
                <button onClick={toggleMute}
                  className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-all">
                  {isMuted ? <VolumeX size={14} className="text-white" /> : <Volume2 size={14} className="text-white" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-16 h-16 rounded-2xl bg-pink-500/10 flex items-center justify-center">
              <Video size={32} className="text-pink-500/30" />
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400 mb-2">Enter a media URL to play</p>
              <input type="text" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="https://... (video, audio, or stream URL)"
                className="w-full px-3 py-2 text-[11px] bg-white/[0.03] border border-white/[0.06] rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-pink-500/40" />
              <div className="flex gap-2 mt-2">
                {(["video", "audio", "stream"] as const).map((type) => (
                  <button key={type} onClick={() => setMediaType(type)}
                    className={`px-3 py-1 text-[10px] rounded-md transition-all ${mediaType === type ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-white/5 text-slate-500 border border-white/5 hover:text-slate-400'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-pink-500 !border-pink-400 !w-3 !h-3" />
    </div>
  );
}
