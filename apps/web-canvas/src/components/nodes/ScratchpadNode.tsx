import React, { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { StickyNote, Edit3, Eye, X, Pen } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-white/90 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-white/90 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-white mb-2">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/90">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-slate-400">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-white/5 px-1 py-0.5 rounded text-[10px] font-mono text-emerald-300 border border-white/5">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-3 text-[11px] text-slate-400">• $1</li>')
    .replace(/^- \[x\] (.+)$/gm, '<li class="ml-3 text-[11px] text-slate-600 line-through">☑ $1</li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="ml-3 text-[11px] text-slate-400">☐ $1</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-emerald-400 hover:underline" target="_blank">$1</a>')
    .replace(/^---$/gm, '<hr class="border-white/5 my-2" />')
    .replace(/\n/g, "<br />");
}

export function ScratchpadNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const [content, setContent] = useState((nodeData.content as string) || "# Scratchpad\n\nWrite your notes here...");
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="w-72 glass-card rounded-2xl overflow-hidden node-scratchpad animate-fade-in">
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !border-emerald-400" />

      <div className="relative px-4 py-3 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-green-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Pen size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white/90">{nodeData.label || "Scratchpad"}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsEditing(!isEditing)} className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
              {isEditing ? <Eye size={12} /> : <Edit3 size={12} />}
            </button>
            <button onClick={() => deleteNode(id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
              <X size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="h-48">
        {isEditing ? (
          <textarea value={content} onChange={(e) => { setContent(e.target.value); updateNode(id, { content: e.target.value }); }}
            className="w-full h-full p-3 bg-transparent text-[11px] font-mono text-slate-300 resize-none focus:outline-none placeholder-slate-700 leading-relaxed"
            placeholder="Write markdown here..." spellCheck={false} />
        ) : (
          <div className="w-full h-full p-3 overflow-auto text-[11px] text-slate-400 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !border-emerald-400" />
    </div>
  );
}
