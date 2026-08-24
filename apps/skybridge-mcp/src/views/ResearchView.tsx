import React, { useState, useCallback } from "react";

interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  expanded?: boolean;
}

interface ResearchViewProps {
  tree: TreeNode[];
  topic: string;
  onNodeToggle?: (nodeId: string) => void;
  onNodeClick?: (nodeId: string) => void;
}

const DEPTH_COLORS = ["#22d3ee", "#60a5fa", "#a78bfa", "#f472b6", "#fbbf24"];

function TreeItem({
  node,
  depth,
  onToggle,
  onClick,
}: {
  node: TreeNode;
  depth: number;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(node.expanded || false);
  const hasChildren = node.children && node.children.length > 0;
  const color = DEPTH_COLORS[depth % DEPTH_COLORS.length];

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setExpanded((prev) => !prev);
      onToggle(node.id);
    }
    onClick(node.id);
  }, [hasChildren, node.id, onToggle, onClick]);

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
      <div
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          borderRadius: 6,
          cursor: "pointer",
          transition: "background 0.15s",
          margin: "2px 0",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(34, 211, 238, 0.1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "transparent";
        }}
      >
        <span style={{ fontSize: 10, width: 14, textAlign: "center", color }}>
          {hasChildren ? (expanded ? "▼" : "▶") : "•"}
        </span>
        <span style={{ fontWeight: 500, color, fontSize: 13 }}>{node.label}</span>
      </div>
      {expanded &&
        node.children?.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            depth={depth + 1}
            onToggle={onToggle}
            onClick={onClick}
          />
        ))}
    </div>
  );
}

export function ResearchView({ tree, topic, onNodeToggle, onNodeClick }: ResearchViewProps) {
  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#12121e",
        color: "#94a3b8",
        padding: 16,
        fontSize: 13,
      }}
    >
      <h3 style={{ color: "#22d3ee", marginBottom: 12, fontSize: 14 }}>🔬 {topic}</h3>
      {tree.map((node) => (
        <TreeItem
          key={node.id}
          node={node}
          depth={0}
          onToggle={onNodeToggle || (() => {})}
          onClick={onNodeClick || (() => {})}
        />
      ))}
    </div>
  );
}

export default ResearchView;
