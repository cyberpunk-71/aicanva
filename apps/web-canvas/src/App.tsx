import React, { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { CanvasViewport } from "./components/canvas/CanvasViewport";
import { useCanvasSocket } from "./hooks/useCanvasSocket";
import { useCanvasStore } from "./store/canvasStore";

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

function CanvasApp() {
  const { send } = useCanvasSocket();

  // Load existing canvas state from REST API on mount
  useEffect(() => {
    fetch(`${API_URL}/api/canvas`)
      .then((res) => res.json())
      .then((state) => {
        if (state.nodes && state.nodes.length > 0) {
          const store = useCanvasStore.getState();
          // Only import if we don't already have nodes (avoid overwriting local state)
          if (store.nodes.length === 0) {
            // Convert server node format to ReactFlow format
            const nodes = state.nodes.map((n: Record<string, unknown>) => ({
              id: n.id,
              type: (n.data as Record<string, unknown>)?.type as string || n.type as string || "chat",
              position: n.position,
              data: n.data,
            }));
            const edges = state.edges.map((e: Record<string, unknown>) => ({
              ...e,
              type: e.type || "statusEdge",
            }));
            useCanvasStore.setState({ nodes, edges });
            console.log(`[Canvas] Loaded ${nodes.length} nodes and ${edges.length} edges from server`);
          }
        }
      })
      .catch((err) => {
        console.log("[Canvas] Could not load initial state:", err.message);
      });
  }, []);

  return (
    <div className="w-screen h-screen bg-canvas-bg">
      <CanvasViewport />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <CanvasApp />
    </ReactFlowProvider>
  );
}
