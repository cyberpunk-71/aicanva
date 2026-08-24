import React, { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch, ChevronRight, ChevronDown, X, Plus } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  expanded?: boolean;
  color?: string;
}

const DEPTH_COLORS = [
  "text-cyan-400",
  "text-blue-400",
  "text-violet-400",
  "text-pink-400",
  "text-amber-400",
];

const DEPTH_BG = [
  "bg-cyan-500/10 border-cyan-500/20",
  "bg-blue-500/10 border-blue-500/20",
  "bg-violet-500/10 border-violet-500/20",
  "bg-pink-500/10 border-pink-500/20",
  "bg-amber-500/10 border-amber-500/20",
];

function TreeItem({
  node,
  depth,
  onToggle,
  onAddChild,
}: {
  node: TreeNode;
  depth: number;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const hasChildren = node.children && node.children.length > 0;
  const colorClass = DEPTH_COLORS[depth % DEPTH_COLORS.length];
  const bgClass = DEPTH_BG[depth % DEPTH_BG.length];

  return (
    <div style={{ paddingLeft: `${depth * 16}px` }}>
      <div
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${bgClass} mb-1 group cursor-pointer hover:brightness-125 transition-all`}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        {hasChildren ? (
          node.expanded ? (
            <ChevronDown size={12} className={colorClass} />
          ) : (
            <ChevronRight size={12} className={colorClass} />
          )
        ) : (
          <span className="w-3" />
        )}
        <span className={`text-xs font-medium ${colorClass}`}>{node.label}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(node.id);
          }}
          className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-opacity"
        >
          <Plus size={10} className="text-slate-400" />
        </button>
      </div>
      {node.expanded &&
        node.children?.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            onToggle={onToggle}
            onAddChild={onAddChild}
          />
        ))}
    </div>
  );
}

function toggleTreeNode(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, expanded: !node.expanded };
    if (node.children) return { ...node, children: toggleTreeNode(node.children, id) };
    return node;
  });
}

function addChildToNode(nodes: TreeNode[], parentId: string, newChild: TreeNode): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        expanded: true,
        children: [...(node.children || []), newChild],
      };
    }
    if (node.children) {
      return { ...node, children: addChildToNode(node.children, parentId, newChild) };
    }
    return node;
  });
}

const defaultTree: TreeNode[] = [
  {
    id: "root",
    label: "Research Topic",
    expanded: true,
    children: [
      { id: "1", label: "Background", expanded: false, children: [
        { id: "1a", label: "History" },
        { id: "1b", label: "Context" },
      ]},
      { id: "2", label: "Analysis", expanded: false, children: [
        { id: "2a", label: "Data Sources" },
        { id: "2b", label: "Methodology" },
      ]},
      { id: "3", label: "Conclusions" },
    ],
  },
];

export function ResearchNode({ id, data }: NodeProps) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const [tree, setTree] = useState<TreeNode[]>(
    (nodeData.tree as TreeNode[]) || defaultTree
  );

  const handleToggle = (nodeId: string) => {
    const newTree = toggleTreeNode(tree, nodeId);
    setTree(newTree);
    updateNode(id, { tree: newTree });
  };

  const handleAddChild = (parentId: string) => {
    const newChild: TreeNode = {
      id: `node-${Date.now()}`,
      label: "New Item",
    };
    const newTree = addChildToNode(tree, parentId, newChild);
    setTree(newTree);
    updateNode(id, { tree: newTree });
  };

  return (
    <div className="w-72 bg-canvas-node border border-canvas-border rounded-xl shadow-2xl overflow-hidden">
      <Handle type="target" position={Position.Top} className="!bg-cyan-500" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-canvas-border bg-cyan-500/10">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-cyan-400" />
          <span className="text-sm font-semibold text-slate-200">
            {nodeData.label || "Research Tree"}
          </span>
        </div>
        <button
          onClick={() => deleteNode(id)}
          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Tree content */}
      <div className="max-h-64 overflow-y-auto p-3 space-y-0.5">
        {tree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            depth={0}
            onToggle={handleToggle}
            onAddChild={handleAddChild}
          />
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
    </div>
  );
}
