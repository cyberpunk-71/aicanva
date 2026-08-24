import React from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { CanvasViewport } from "./components/canvas/CanvasViewport";
import { useCanvasSocket } from "./hooks/useCanvasSocket";

function CanvasApp() {
  // Initialize WebSocket connection to gateway
  useCanvasSocket();

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
