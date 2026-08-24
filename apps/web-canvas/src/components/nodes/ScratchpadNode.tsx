import React, { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Edit3, Eye, X, Pen, Maximize2, Minimize2 } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-white/90 mb-1 mt-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-white/90 mb-2 mt-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-white mb-2 mt-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/90">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-slate-400">$1</em>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-black/30 rounded-lg p-3 my-2 text-[11px] font-mono overflow-auto border border-white/5"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-white/5 px-1.5 py-0.5 rounded text-[11px] font-mono text-emerald-300 border border-white/5">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-3 text-[12px] text-slate-300 py-0.5">• $1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="ml-3 text-[12px] text-slate-600 line-through">☑ $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="ml-3 text-[12px] text-slate-300">☐ $1</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-emerald-400 hover:underline" target="_blank">$1</a>')
    .replace(/^---$/gm, '<hr class="border-white/5 my-3" />')
    .replace(/\n/g, "<br />");
}

export function ScratchpadNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const [content, setContent] = useState((nodeData.content as string) || "# Scratchpad\n\nWrite your notes here...");
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`glass-card rounded-2xl overflow-hidden node-scratchpad animate-fade-in transition-all duration-300 ${isExpanded ? "w-[500px] h-[500px]" : "w-[340px] min-h-[280px]"}`}>
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !border-emerald-400 !w-3 !h-3" />

      <div className="relative px-4 py-3 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-green-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Pen size={16} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white/90">{nodeData.label || "Scratchpad"}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsEditing(!isEditing)} className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
              {isEditing ? <Eye size={12} /> : <Edit3 size={12} />}
            </button>
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
              {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <button onClick={() => deleteNode(id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <X size={12} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: isExpanded ? "calc(100% - 56px)" : "calc(100% - 56px)", minHeight: "200px" }}>
        {isEditing ? (
          <textarea value={content} onChange={(e) => { setContent(e.target.value); updateNode(id, { content: e.target.value }); }}
            className="w-full h-full p-4 bg-transparent text-[12px] font-mono text-slate-300 resize-none focus:outline-none placeholder-slate-700 leading-relaxed"
            placeholder="Write markdown here..." spellCheck={false} />
        ) : (
          <div className="w-full h-full p-4 overflow-auto text-[12px] text-slate-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !border-emerald-400 !w-3 !h-3" />
    </div>
  );
}
