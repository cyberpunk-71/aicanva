import React, { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch, ChevronRight, ChevronDown, X, Plus, Atom } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  expanded?: boolean;
}

const DEPTH_STYLES = [
  { color: "text-cyan-300", bg: "bg-cyan-500/8", border: "border-cyan-500/15", dot: "bg-cyan-400" },
  { color: "text-blue-300", bg: "bg-blue-500/8", border: "border-blue-500/15", dot: "bg-blue-400" },
  { color: "text-violet-300", bg: "bg-violet-500/8", border: "border-violet-500/15", dot: "bg-violet-400" },
  { color: "text-pink-300", bg: "bg-pink-500/8", border: "border-pink-500/15", dot: "bg-pink-400" },
  { color: "text-amber-300", bg: "bg-amber-500/8", border: "border-amber-500/15", dot: "bg-amber-400" },
];

function TreeItem({ node, depth, onToggle, onAddChild }: {
  node: TreeNode; depth: number; onToggle: (id: string) => void; onAddChild: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(node.expanded || false);
  const hasChildren = node.children && node.children.length > 0;
  const style = DEPTH_STYLES[depth % DEPTH_STYLES.length];

  const handleClick = () => {
    if (hasChildren) { setExpanded(!expanded); onToggle(node.id); }
  };

  return (
    <div style={{ paddingLeft: `${depth * 14}px` }}>
      <div
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${style.bg} ${style.border} mb-1 cursor-pointer hover:brightness-150 transition-all group`}
      >
        {hasChildren ? (
          expanded ? <ChevronDown size={11} className={style.color} /> : <ChevronRight size={11} className={style.color} />
        ) : (
          <div className={`w-1.5 h-1.5 rounded-full ${style.dot} ml-1`} />
        )}
        <span className={`text-[11px] font-medium ${style.color} truncate`}>{node.label}</span>
        <button onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
          className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-opacity">
          <Plus size={9} className="text-slate-500" />
        </button>
      </div>
      {expanded && node.children?.map((child) => (
        <TreeItem key={child.id} node={child} depth={depth + 1} onToggle={onToggle} onAddChild={onAddChild} />
      ))}
    </div>
  );
}

function toggleTreeNode(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes.map((n) => n.id === id ? { ...n, expanded: !n.expanded } : n.children ? { ...n, children: toggleTreeNode(n.children, id) } : n);
}
function addChildToNode(nodes: TreeNode[], parentId: string, child: TreeNode): TreeNode[] {
  return nodes.map((n) => n.id === parentId ? { ...n, expanded: true, children: [...(n.children || []), child] } : n.children ? { ...n, children: addChildToNode(n.children, parentId, child) } : n);
}

const defaultTree: TreeNode[] = [
  { id: "root", label: "Research Topic", expanded: true, children: [
    { id: "1", label: "Background", expanded: false, children: [{ id: "1a", label: "History" }, { id: "1b", label: "Context" }] },
    { id: "2", label: "Analysis", expanded: false, children: [{ id: "2a", label: "Data Sources" }, { id: "2b", label: "Methodology" }] },
    { id: "3", label: "Conclusions" },
  ]},
];

export function ResearchNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const [tree, setTree] = useState<TreeNode[]>((nodeData.tree as TreeNode[]) || defaultTree);

  const handleToggle = (nodeId: string) => { const t = toggleTreeNode(tree, nodeId); setTree(t); updateNode(id, { tree: t }); };
  const handleAddChild = (parentId: string) => { const t = addChildToNode(tree, parentId, { id: `n-${Date.now()}`, label: "New Item" }); setTree(t); updateNode(id, { tree: t }); };

  return (
    <div className="w-72 glass-card rounded-2xl overflow-hidden node-research animate-fade-in">
      <Handle type="target" position={Position.Top} className="!bg-cyan-500 !border-cyan-400" />

      <div className="relative px-4 py-3 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-teal-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Atom size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white/90">{nodeData.label || "Research Tree"}</span>
          </div>
          <button onClick={() => deleteNode(id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <X size={13} />
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto p-3 space-y-0.5">
        {tree.map((node) => <TreeItem key={node.id} node={node} depth={0} onToggle={handleToggle} onAddChild={handleAddChild} />)}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !border-cyan-400" />
    </div>
  );
}
