import { nanoid } from "nanoid";
import { StorageService } from "./storageService.js";

interface CanvasNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type: string;
  data?: Record<string, unknown>;
}

const NODE_WIDTH = 320;
const NODE_HEIGHT = 200;
const GRID_SIZE = 40;

export class CanvasStateService {
  private nodes: Map<string, CanvasNode> = new Map();
  private edges: Map<string, CanvasEdge> = new Map();
  private storage: StorageService;

  constructor(storage: StorageService) {
    this.storage = storage;
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const state = this.storage.exportAll();
      for (const node of state.nodes) {
        this.nodes.set(node.id, node);
      }
      for (const edge of state.edges) {
        this.edges.set(edge.id, edge);
      }
      console.log(
        `[CanvasState] Loaded ${this.nodes.size} nodes and ${this.edges.size} edges from storage`
      );
    } catch (err) {
      console.error("[CanvasState] Failed to load from storage:", err);
    }
  }

  getState(): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  getNode(id: string): CanvasNode | undefined {
    return this.nodes.get(id);
  }

  createNode(payload: {
    type?: string;
    data?: Record<string, unknown>;
    position?: { x: number; y: number };
  }): CanvasNode {
    const position = this.getNonOverlappingPosition(payload.position);
    const node: CanvasNode = {
      id: `node-${nanoid(8)}`,
      type: payload.type || "custom",
      position,
      data: payload.data || { label: "New Node", type: "chat" },
    };

    this.nodes.set(node.id, node);
    this.storage.saveNode(node);
    return node;
  }

  updateNode(id: string, data: Record<string, unknown>) {
    const node = this.nodes.get(id);
    if (!node) return;

    node.data = { ...node.data, ...data };
    this.nodes.set(id, node);
    this.storage.saveNode(node);
  }

  updateNodePosition(id: string, position: { x: number; y: number }) {
    const node = this.nodes.get(id);
    if (!node) return;

    node.position = position;
    this.nodes.set(id, node);
    this.storage.saveNode(node);
  }

  deleteNode(id: string) {
    this.nodes.delete(id);
    // Remove connected edges
    for (const [edgeId, edge] of this.edges) {
      if (edge.source === id || edge.target === id) {
        this.edges.delete(edgeId);
        this.storage.deleteEdge(edgeId);
      }
    }
    this.storage.deleteNode(id);
  }

  createEdge(payload: {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    type?: string;
    data?: Record<string, unknown>;
  }): CanvasEdge {
    const edge: CanvasEdge = {
      id: `edge-${nanoid(8)}`,
      source: payload.source,
      target: payload.target,
      sourceHandle: payload.sourceHandle || null,
      targetHandle: payload.targetHandle || null,
      type: payload.type || "statusEdge",
      data: payload.data || { status: "idle" },
    };

    this.edges.set(edge.id, edge);
    this.storage.saveEdge(edge);
    return edge;
  }

  deleteEdge(id: string) {
    this.edges.delete(id);
    this.storage.deleteEdge(id);
  }

  /**
   * Find a non-overlapping position adjacent to a parent node.
   * Tries right, below-right, below, left in order.
   */
  getAdjacentPosition(
    parentPos: { x: number; y: number }
  ): { x: number; y: number } {
    const gap = GRID_SIZE * 2;
    const candidates = [
      { x: parentPos.x + NODE_WIDTH + gap, y: parentPos.y }, // right
      { x: parentPos.x + NODE_WIDTH + gap, y: parentPos.y + NODE_HEIGHT + gap }, // below-right
      { x: parentPos.x, y: parentPos.y + NODE_HEIGHT + gap }, // below
      { x: parentPos.x - NODE_WIDTH - gap, y: parentPos.y }, // left
      { x: parentPos.x - NODE_WIDTH - gap, y: parentPos.y + NODE_HEIGHT + gap }, // below-left
    ];

    const occupied = Array.from(this.nodes.values()).map((n) => ({
      x: n.position.x,
      y: n.position.y,
    }));

    for (const pos of candidates) {
      const overlaps = occupied.some(
        (o) =>
          pos.x < o.x + NODE_WIDTH + GRID_SIZE &&
          pos.x + NODE_WIDTH + GRID_SIZE > o.x &&
          pos.y < o.y + NODE_HEIGHT + GRID_SIZE &&
          pos.y + NODE_HEIGHT + GRID_SIZE > o.y
      );
      if (!overlaps) return pos;
    }

    // Fallback: use standard non-overlapping placement
    return this.getNonOverlappingPosition({
      x: parentPos.x + NODE_WIDTH + gap,
      y: parentPos.y,
    });
  }

  private getNonOverlappingPosition(
    preferred?: { x: number; y: number }
  ): { x: number; y: number } {
    const pos = preferred || { x: 100, y: 100 };
    const occupied = Array.from(this.nodes.values()).map((n) => ({
      x: n.position.x,
      y: n.position.y,
    }));

    let attempts = 0;
    while (attempts < 100) {
      const overlaps = occupied.some(
        (o) =>
          pos.x < o.x + NODE_WIDTH + GRID_SIZE &&
          pos.x + NODE_WIDTH + GRID_SIZE > o.x &&
          pos.y < o.y + NODE_HEIGHT + GRID_SIZE &&
          pos.y + NODE_HEIGHT + GRID_SIZE > o.y
      );
      if (!overlaps) return pos;
      pos.x += NODE_WIDTH + GRID_SIZE * 2;
      if (pos.x > 2000) {
        pos.x = 100;
        pos.y += NODE_HEIGHT + GRID_SIZE * 2;
      }
      attempts++;
    }
    return pos;
  }
}
