import React from "react";
import { MiniMap as ReactFlowMiniMap } from "@xyflow/react";

export function Minimap() {
  return (
    <ReactFlowMiniMap
      nodeColor={(node) => {
        switch (node.data?.type) {
          case "chat":
            return "#6366f1";
          case "skybridge":
            return "#8b5cf6";
          case "research":
            return "#06b6d4";
          case "code":
            return "#f59e0b";
          case "scratchpad":
            return "#22c55e";
          default:
            return "#4a4a6a";
        }
      }}
      maskColor="rgba(10, 10, 15, 0.7)"
      style={{
        backgroundColor: "rgba(10, 10, 15, 0.8)",
        border: "1px solid #2a2a3e",
        borderRadius: 8,
      }}
      pannable
      zoomable
    />
  );
}
