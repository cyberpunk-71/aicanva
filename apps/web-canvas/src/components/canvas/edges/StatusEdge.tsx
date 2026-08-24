import React from "react";
import {
  type EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
} from "@xyflow/react";
import type { NodeStatus } from "../../../store/canvasStore";

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "#4a4a6a",
  running: "#3b82f6",
  success: "#22c55e",
  error: "#ef4444",
};

const STATUS_GLOW: Record<NodeStatus, string> = {
  idle: "none",
  running: "drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))",
  success: "drop-shadow(0 0 6px rgba(34, 197, 94, 0.6))",
  error: "drop-shadow(0 0 6px rgba(239, 68, 68, 0.6))",
};

export function StatusEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const status: NodeStatus = (data?.status as NodeStatus) || "idle";
  const color = STATUS_COLORS[status];
  const glow = STATUS_GLOW[status];
  const isAnimated = status === "running";

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      {/* Glow layer */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 4 : 2}
        strokeOpacity={0.3}
        filter={glow}
        style={{ pointerEvents: "none" }}
      />
      {/* Main path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 3 : 2}
        strokeLinecap="round"
        className={isAnimated ? "animated-edge" : ""}
        style={{
          strokeDasharray: isAnimated ? "8 4" : "none",
          animation: isAnimated ? "edgeFlow 1s linear infinite" : "none",
        }}
      />
      {/* Status indicator dot */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div
            className="w-3 h-3 rounded-full border-2 border-canvas-bg"
            style={{
              backgroundColor: color,
              boxShadow: status !== "idle" ? `0 0 8px ${color}` : "none",
            }}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
