import React from "react";
import { MessageSquare, Puzzle, GitBranch, Code2, StickyNote, LayoutGrid, Trash2, Download, Upload, Plus } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

const nodeTypes: Array<{
  type: CanvasNode["data"]["type"]; label: string; icon: React.ReactNode;
  gradient: string; shadow: string;
}> = [
  { type: "chat", label: "Chat", icon: <MessageSquare size={14} />, gradient: "from-indigo-500 to-violet-600", shadow: "shadow-indigo-500/25" },
  { type: "skybridge", label: "Widget", icon: <Puzzle size={14} />, gradient: "from-violet-500 to-purple-600", shadow: "shadow-violet-500/25" },
  { type: "research", label: "Research", icon: <GitBranch size={14} />, gradient: "from-cyan-500 to-teal-600", shadow: "shadow-cyan-500/25" },
  { type: "code", label: "Code", icon: <Code2 size={14} />, gradient: "from-amber-500 to-orange-600", shadow: "shadow-amber-500/25" },
  { type: "scratchpad", label: "Notes", icon: <StickyNote size={14} />, gradient: "from-emerald-500 to-green-600", shadow: "shadow-emerald-500/25" },
];

export function CanvasToolbar() {
  const { addNode, clearCanvas, nodes, edges } = useCanvasStore();

  const handleExport = () => {
    const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `canvas-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input"); input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => { try { useCanvasStore.getState().importState(JSON.parse(ev.target?.result as string)); } catch {} };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleAutoLayout = () => {
    const store = useCanvasStore.getState(); const cols = Math.ceil(Math.sqrt(store.nodes.length));
    store.nodes.forEach((n, i) => { store.updateNodePosition(n.id, { x: 100 + (i % cols) * 400, y: 100 + Math.floor(i / cols) * 320 }); });
  };

  return (
    <div className="animate-slide-down flex items-center gap-1.5 px-2 py-1.5 glass-card rounded-2xl">
      {/* Node creation buttons */}
      {nodeTypes.map((nt) => (
        <button key={nt.type} onClick={() => addNode(nt.type)}
          className={`group flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium text-slate-400 hover:text-white rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
          title={`Add ${nt.label}`}>
          <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${nt.gradient} flex items-center justify-center shadow-md ${nt.shadow} group-hover:shadow-lg transition-shadow`}>
            {nt.icon}
          </div>
          <span className="hidden sm:inline">{nt.label}</span>
        </button>
      ))}

      <div className="w-px h-7 bg-white/[0.06] mx-1" />

      {/* Utility buttons */}
      {[
        { icon: <LayoutGrid size={14} />, action: handleAutoLayout, title: "Auto Layout", color: "hover:text-blue-400 hover:bg-blue-500/10" },
        { icon: <Download size={14} />, action: handleExport, title: "Export", color: "hover:text-cyan-400 hover:bg-cyan-500/10" },
        { icon: <Upload size={14} />, action: handleImport, title: "Import", color: "hover:text-emerald-400 hover:bg-emerald-500/10" },
        { icon: <Trash2 size={14} />, action: clearCanvas, title: "Clear", color: "hover:text-red-400 hover:bg-red-500/10" },
      ].map((btn, i) => (
        <button key={i} onClick={btn.action} title={btn.title}
          className={`p-2 rounded-xl text-slate-600 ${btn.color} transition-all duration-200 active:scale-95`}>
          {btn.icon}
        </button>
      ))}

      <div className="w-px h-7 bg-white/[0.06] mx-1" />
      <div className="px-2 text-[10px] text-slate-700 font-medium">
        {nodes.length}N · {edges.length}E
      </div>
    </div>
  );
}
