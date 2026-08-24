import React, { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { StickyNote, Edit3, Eye, X } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

// Simple markdown-to-HTML renderer (no external dependency)
function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold text-slate-200 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-slate-200 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-slate-100 mb-2">$1</h1>')
    // Bold & Italic
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-200">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(
      /```(\w*)\n([\s\S]*?)```/g,
      '<pre class="bg-black/30 rounded p-2 my-1 text-xs font-mono overflow-auto"><code>$2</code></pre>'
    )
    // Inline code
    .replace(
      /`([^`]+)`/g,
      '<code class="bg-black/30 px-1 py-0.5 rounded text-xs font-mono text-amber-300">$1</code>'
    )
    // Lists
    .replace(/^- (.+)$/gm, '<li class="ml-3 text-xs text-slate-300">• $1</li>')
    // Checkboxes
    .replace(
      /^\- \[x\] (.+)$/gm,
      '<li class="ml-3 text-xs text-slate-500 line-through">☑ $1</li>'
    )
    .replace(
      /^\- \[ \] (.+)$/gm,
      '<li class="ml-3 text-xs text-slate-300">☐ $1</li>'
    )
    // Links
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="text-indigo-400 hover:underline" target="_blank">$1</a>'
    )
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-canvas-border my-2" />')
    // Line breaks
    .replace(/\n/g, "<br />");
}

export function ScratchpadNode({ id, data }: NodeProps) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);

  const [content, setContent] = useState(
    (nodeData.content as string) || "# Scratchpad\n\nWrite your notes here..."
  );
  const [isEditing, setIsEditing] = useState(false);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    updateNode(id, { content: e.target.value });
  };

  return (
    <div className="w-72 bg-canvas-node border border-canvas-border rounded-xl shadow-2xl overflow-hidden">
      <Handle type="target" position={Position.Top} className="!bg-green-500" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-canvas-border bg-green-500/10">
        <div className="flex items-center gap-2">
          <StickyNote size={14} className="text-green-400" />
          <span className="text-sm font-semibold text-slate-200">
            {nodeData.label || "Scratchpad"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 text-slate-500 hover:text-green-400 transition-colors"
            title={isEditing ? "Preview" : "Edit"}
          >
            {isEditing ? <Eye size={12} /> : <Edit3 size={12} />}
          </button>
          <button
            onClick={() => deleteNode(id)}
            className="p-1 text-slate-500 hover:text-red-400 transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="h-48">
        {isEditing ? (
          <textarea
            value={content}
            onChange={handleContentChange}
            className="w-full h-full p-3 bg-transparent text-xs font-mono text-slate-300 resize-none focus:outline-none placeholder-slate-600"
            placeholder="Write markdown here..."
            spellCheck={false}
          />
        ) : (
          <div
            className="w-full h-full p-3 overflow-auto text-xs text-slate-400"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
}
