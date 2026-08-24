import { Router, Request, Response } from "express";
import { CanvasStateService } from "../services/canvasStateService.js";

export const canvasRoutes = Router();

// GET /api/canvas — Get full canvas state
canvasRoutes.get("/", (req: Request, res: Response) => {
  const canvasState: CanvasStateService = req.app.locals.canvasState;
  const state = canvasState.getState();
  res.json(state);
});

// POST /api/canvas/export — Export canvas as JSON
canvasRoutes.post("/export", (req: Request, res: Response) => {
  const canvasState: CanvasStateService = req.app.locals.canvasState;
  const state = canvasState.getState();
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="canvas-export-${Date.now()}.json"`
  );
  res.json(state);
});

// POST /api/canvas/import — Import canvas from JSON
canvasRoutes.post("/import", (req: Request, res: Response) => {
  const canvasState: CanvasStateService = req.app.locals.canvasState;
  const broadcast: (msg: object) => void = req.app.locals.broadcast;

  try {
    const { nodes, edges } = req.body;

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return res.status(400).json({ error: "Invalid format: expected { nodes: [], edges: [] }" });
    }

    // Import nodes
    for (const node of nodes) {
      canvasState.createNode({
        type: node.type || node.data?.type || "custom",
        data: node.data,
        position: node.position,
      });
    }

    // Import edges
    for (const edge of edges) {
      canvasState.createEdge({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edge.type,
        data: edge.data,
      });
    }

    // Broadcast new state to all connected clients
    const state = canvasState.getState();
    broadcast({ type: "canvas:state", payload: state });

    res.json({ success: true, nodes: state.nodes.length, edges: state.edges.length });
  } catch (err) {
    res.status(500).json({
      error: "Import failed",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

// DELETE /api/canvas/nodes/:id — Delete a specific node
canvasRoutes.delete("/nodes/:id", (req: Request, res: Response) => {
  const canvasState: CanvasStateService = req.app.locals.canvasState;
  const broadcast: (msg: object) => void = req.app.locals.broadcast;
  const { id } = req.params;

  canvasState.deleteNode(id);
  broadcast({ type: "canvas:delete-node", payload: { id } });
  res.json({ success: true, deleted: id });
});

// DELETE /api/canvas — Clear all canvas data
canvasRoutes.delete("/", (req: Request, res: Response) => {
  const canvasState: CanvasStateService = req.app.locals.canvasState;
  const broadcast: (msg: object) => void = req.app.locals.broadcast;

  const state = canvasState.getState();
  for (const node of state.nodes) {
    canvasState.deleteNode(node.id);
  }

  broadcast({ type: "canvas:state", payload: { nodes: [], edges: [] } });
  res.json({ success: true, cleared: true });
});
