import React from "react";
import {
  MessageSquare,
  Puzzle,
  GitBranch,
  Code2,
  StickyNote,
  LayoutGrid,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

const nodeTypes: Array<{
  type: CanvasNode["data"]["type"];
  label: string;
  icon: React.ReactNode;
  color: string;
}> = [
  { type: "chat", label: "Chat", icon: <MessageSquare size={16} />, color: "bg-indigo-500" },
  { type: "skybridge", label: "Widget", icon: <Puzzle size={16} />, color: "bg-violet-500" },
  { type: "research", label: "Research", icon: <GitBranch size={16} />, color: "bg-cyan-500" },
  { type: "code", label: "Code", icon: <Code2 size={16} />, color: "bg-amber-500" },
  { type: "scratchpad", label: "Notes", icon: <StickyNote size={16} />, color: "bg-green-500" },
];

export function CanvasToolbar() {
  const { addNode, clearCanvas, nodes, edges } = useCanvasStore();

  const handleExport = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `canvas-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          useCanvasStore.getState().importState(data);
        } catch (err) {
          console.error("Import failed:", err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleAutoLayout = () => {
    const store = useCanvasStore.getState();
    const spacing = 400;
    const cols = Math.ceil(Math.sqrt(store.nodes.length));
    store.nodes.forEach((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      store.updateNodePosition(node.id, {
        x: 100 + col * spacing,
        y: 100 + row * 300,
      });
    });
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 bg-canvas-node/90 backdrop-blur-sm border border-canvas-border rounded-xl shadow-lg">
      {/* Node creation buttons */}
      {nodeTypes.map((nt) => (
        <button
          key={nt.type}
          onClick={() => addNode(nt.type)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-150 hover:scale-105 active:scale-95"
          title={`Add ${nt.label} Node`}
        >
          <span className={`${nt.color} p-1 rounded`}>{nt.icon}</span>
          {nt.label}
        </button>
      ))}

      <div className="w-px h-6 bg-canvas-border mx-1" />

      {/* Utility buttons */}
      <button
        onClick={handleAutoLayout}
        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        title="Auto Layout"
      >
        <LayoutGrid size={16} />
      </button>
      <button
        onClick={handleExport}
        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        title="Export Canvas"
      >
        <Download size={16} />
      </button>
      <button
        onClick={handleImport}
        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        title="Import Canvas"
      >
        <Upload size={16} />
      </button>
      <button
        onClick={clearCanvas}
        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        title="Clear Canvas"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
