import React from "react";
import { type EdgeProps, getBezierPath, EdgeLabelRenderer } from "@xyflow/react";
import type { NodeStatus } from "../../../store/canvasStore";

const STATUS: Record<NodeStatus, { color: string; glow: string }> = {
  idle: { color: "#334155", glow: "none" },
  running: { color: "#3b82f6", glow: "drop-shadow(0 0 8px rgba(59,130,246,0.5))" },
  success: { color: "#22c55e", glow: "drop-shadow(0 0 8px rgba(34,197,94,0.5))" },
  error: { color: "#ef4444", glow: "drop-shadow(0 0 8px rgba(239,68,68,0.5))" },
};

export function StatusEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps) {
  const status: NodeStatus = (data?.status as NodeStatus) || "idle";
  const { color, glow } = STATUS[status];
  const isAnimated = status === "running";

  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return (
    <>
      <path d={edgePath} fill="none" stroke={color} strokeWidth={selected ? 5 : 3} strokeOpacity={0.15} filter={glow} />
      <path id={id} d={edgePath} fill="none" stroke={color} strokeWidth={selected ? 2.5 : 1.5} strokeLinecap="round"
        className={isAnimated ? "animated-edge" : ""}
        style={{ strokeDasharray: isAnimated ? "8 4" : "none", animation: isAnimated ? "edgeFlow 1s linear infinite" : "none" }} />
      <EdgeLabelRenderer>
        <div style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: "all" }} className="nodrag nopan">
          <div className="w-2.5 h-2.5 rounded-full border-2 border-[#06060e]"
            style={{ backgroundColor: color, boxShadow: status !== "idle" ? `0 0 10px ${color}` : "none" }} />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
