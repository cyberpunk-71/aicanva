import React, { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { ChevronRight, ChevronDown, X, Plus, Atom, BookOpen, Lightbulb, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { useCanvasStore, type CanvasNode } from "../../store/canvasStore";

interface TreeNode { id: string; label: string; children?: TreeNode[]; expanded?: boolean; }

const DEPTH_STYLES = [
  { color: "text-cyan-300", bg: "bg-cyan-500/8", border: "border-cyan-500/15", dot: "bg-cyan-400" },
  { color: "text-blue-300", bg: "bg-blue-500/8", border: "border-blue-500/15", dot: "bg-blue-400" },
  { color: "text-violet-300", bg: "bg-violet-500/8", border: "border-violet-500/15", dot: "bg-violet-400" },
  { color: "text-pink-300", bg: "bg-pink-500/8", border: "border-pink-500/15", dot: "bg-pink-400" },
];

function TreeItem({ node, depth, onToggle, onAddChild }: { node: TreeNode; depth: number; onToggle: (id: string) => void; onAddChild: (parentId: string) => void; }) {
  const [expanded, setExpanded] = useState(node.expanded || false);
  const hasChildren = node.children && node.children.length > 0;
  const style = DEPTH_STYLES[depth % DEPTH_STYLES.length];
  return (
    <div style={{ paddingLeft: `${depth * 14}px` }}>
      <div onClick={() => { if (hasChildren) { setExpanded(!expanded); onToggle(node.id); } }}
        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border ${style.bg} ${style.border} mb-1 cursor-pointer hover:brightness-150 transition-all group`}>
        {hasChildren ? (expanded ? <ChevronDown size={11} className={style.color} /> : <ChevronRight size={11} className={style.color} />) : <div className={`w-1.5 h-1.5 rounded-full ${style.dot} ml-1`} />}
        <span className={`text-[12px] font-medium ${style.color}`}>{node.label}</span>
        <button onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }} className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-opacity"><Plus size={9} className="text-slate-500" /></button>
      </div>
      {expanded && node.children?.map((child) => <TreeItem key={child.id} node={child} depth={depth + 1} onToggle={onToggle} onAddChild={onAddChild} />)}
    </div>
  );
}

function toggleTreeNode(nodes: TreeNode[], id: string): TreeNode[] { return nodes.map((n) => n.id === id ? { ...n, expanded: !n.expanded } : n.children ? { ...n, children: toggleTreeNode(n.children, id) } : n); }
function addChildToNode(nodes: TreeNode[], parentId: string, child: TreeNode): TreeNode[] { return nodes.map((n) => n.id === parentId ? { ...n, expanded: true, children: [...(n.children || []), child] } : n.children ? { ...n, children: addChildToNode(n.children, parentId, child) } : n); }

const defaultTree: TreeNode[] = [{ id: "root", label: "Research Topic", expanded: true, children: [
  { id: "1", label: "Background", children: [{ id: "1a", label: "History" }, { id: "1b", label: "Context" }] },
  { id: "2", label: "Analysis", children: [{ id: "2a", label: "Data Sources" }, { id: "2b", label: "Methodology" }] },
  { id: "3", label: "Conclusions" },
]}];

export function ResearchNode({ id, data }: NodeProps & { data: Record<string, unknown> }) {
  const nodeData = data as CanvasNode["data"];
  const updateNode = useCanvasStore((s) => s.updateNode);
  const deleteNode = useCanvasStore((s) => s.deleteNode);
  const [tree, setTree] = useState<TreeNode[]>((nodeData.tree as TreeNode[]) || defaultTree);
  const [activeSection, setActiveSection] = useState<"tree" | "details">("tree");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = (nodeId: string) => { const t = toggleTreeNode(tree, nodeId); setTree(t); updateNode(id, { tree: t }); };
  const handleAddChild = (parentId: string) => { const t = addChildToNode(tree, parentId, { id: `n-${Date.now()}`, label: "New Item" }); setTree(t); updateNode(id, { tree: t }); };

  const hasRichData = !!(nodeData.summary || nodeData.key_concepts || nodeData.why_it_matters || nodeData.key_algorithms);
  const summary = nodeData.summary as string | undefined;
  const keyConcepts = nodeData.key_concepts as string[] | undefined;
  const whyItMatters = nodeData.why_it_matters as string[] | undefined;
  const keyAlgorithms = nodeData.key_algorithms as string[] | undefined;
  const currentState = nodeData.current_state as string | undefined;
  const sources = nodeData.sources as string[] | undefined;

  return (
    <div className={`glass-card rounded-2xl overflow-hidden node-research animate-fade-in transition-all duration-300 ${isExpanded ? "w-[550px] h-[600px]" : "w-[380px] min-h-[300px]"}`}>
      <Handle type="target" position={Position.Top} className="!bg-cyan-500 !border-cyan-400 !w-3 !h-3" />

      <div className="relative px-4 py-3 border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-teal-500/5" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Atom size={16} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white/90 block">{nodeData.label || "Research Tree"}</span>
              {nodeData.topic ? <span className="text-[10px] text-cyan-400/60">{String(nodeData.topic)}</span> : null}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-lg text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
              {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <button onClick={() => deleteNode(id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><X size={13} /></button>
          </div>
        </div>
      </div>

      {hasRichData && (
        <div className="flex border-b border-white/5">
          {(["tree", "details"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveSection(tab)}
              className={`flex-1 px-3 py-2 text-[11px] font-medium transition-all ${activeSection === tab ? "text-cyan-300 border-b-2 border-cyan-400 bg-cyan-500/5" : "text-slate-600 hover:text-slate-400"}`}>
              {tab === "tree" ? <Atom size={10} className="inline mr-1" /> : <BookOpen size={10} className="inline mr-1" />}
              {tab === "tree" ? "Tree" : "Details"}
            </button>
          ))}
        </div>
      )}

      {(!hasRichData || activeSection === "tree") && (
        <div className="overflow-y-auto p-3 space-y-0.5" style={{ height: isExpanded ? "calc(100% - 56px)" : "calc(100% - 56px)", minHeight: "200px" }}>
          {tree.map((node) => <TreeItem key={node.id} node={node} depth={0} onToggle={handleToggle} onAddChild={handleAddChild} />)}
        </div>
      )}

      {hasRichData && activeSection === "details" && (
        <div className="overflow-y-auto p-4 space-y-4" style={{ height: isExpanded ? "calc(100% - 100px)" : "calc(100% - 100px)", minHeight: "200px" }}>
          {summary && <p className="text-[12px] text-slate-300 leading-relaxed">{summary}</p>}
          {keyConcepts && keyConcepts.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2"><Lightbulb size={11} className="text-cyan-400" /><span className="text-[10px] font-semibold text-cyan-300 uppercase tracking-wider">Key Concepts</span></div>
              <div className="space-y-1.5">{keyConcepts.map((c, i) => <div key={i} className="text-[11px] text-slate-400 leading-relaxed pl-3 border-l-2 border-cyan-500/20 py-0.5">{c}</div>)}</div>
            </div>
          )}
          {whyItMatters && whyItMatters.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">Why It Matters</span>
              <div className="mt-1.5 space-y-1">{whyItMatters.map((w, i) => <div key={i} className="text-[11px] text-slate-400 leading-relaxed">• {w}</div>)}</div>
            </div>
          )}
          {keyAlgorithms && keyAlgorithms.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider">Key Algorithms</span>
              <div className="mt-1.5 space-y-1.5">{keyAlgorithms.map((a, i) => <div key={i} className="text-[11px] text-slate-400 leading-relaxed pl-3 border-l-2 border-amber-500/20 py-0.5">{a}</div>)}</div>
            </div>
          )}
          {currentState && (
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <span className="text-[10px] font-semibold text-violet-300 uppercase tracking-wider">Current State</span>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1.5">{currentState}</p>
            </div>
          )}
          {sources && sources.length > 0 && (
            <div>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Sources</span>
              <div className="mt-1.5 space-y-1">{sources.map((s, i) => <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500"><ExternalLink size={9} /><span className="truncate">{s}</span></div>)}</div>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !border-cyan-400 !w-3 !h-3" />
    </div>
  );
}
