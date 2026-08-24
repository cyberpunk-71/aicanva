import path from "path";
import fs from "fs";

const DATA_PATH = process.env.DB_PATH || "./data/canvas.json";

interface StoredState {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle: string | null;
    targetHandle: string | null;
    type: string;
    data: Record<string, unknown>;
  }>;
}

/**
 * JSON file-based persistence for canvas state.
 * Replaces SQLite for environments without native build support.
 */
export class StorageService {
  private filePath: string;
  private state: StoredState;

  constructor() {
    this.filePath = path.resolve(DATA_PATH);

    // Ensure data directory exists
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Load existing data or initialize empty state
    this.state = this.loadFromDisk();
    console.log(
      `[Storage] Loaded ${this.state.nodes.length} nodes and ${this.state.edges.length} edges from ${this.filePath}`
    );
  }

  private loadFromDisk(): StoredState {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("[Storage] Failed to load data file:", err);
    }
    return { nodes: [], edges: [] };
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), "utf-8");
    } catch (err) {
      console.error("[Storage] Failed to save data file:", err);
    }
  }

  // Node operations
  getNodes(): StoredState["nodes"] {
    return this.state.nodes;
  }

  saveNode(node: {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }) {
    const existing = this.state.nodes.findIndex((n) => n.id === node.id);
    if (existing >= 0) {
      this.state.nodes[existing] = node;
    } else {
      this.state.nodes.push(node);
    }
    this.saveToDisk();
  }

  deleteNode(id: string) {
    this.state.nodes = this.state.nodes.filter((n) => n.id !== id);
    this.state.edges = this.state.edges.filter(
      (e) => e.source !== id && e.target !== id
    );
    this.saveToDisk();
  }

  // Edge operations
  getEdges(): StoredState["edges"] {
    return this.state.edges;
  }

  saveEdge(edge: {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    type?: string;
    data?: Record<string, unknown>;
  }) {
    const existing = this.state.edges.findIndex((e) => e.id === edge.id);
    const record = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null,
      type: edge.type || "statusEdge",
      data: edge.data || {},
    };
    if (existing >= 0) {
      this.state.edges[existing] = record;
    } else {
      this.state.edges.push(record);
    }
    this.saveToDisk();
  }

  deleteEdge(id: string) {
    this.state.edges = this.state.edges.filter((e) => e.id !== id);
    this.saveToDisk();
  }

  // Export/Import
  exportAll(): StoredState {
    return {
      nodes: this.state.nodes.map((n) => ({
        id: n.id,
        type: n.type || "custom",
        position: n.position,
        data: n.data,
      })),
      edges: this.state.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.type,
        data: e.data,
      })),
    };
  }

  importAll(data: { nodes: any[]; edges: any[] }) {
    this.state.nodes = data.nodes.map((n) => ({
      id: n.id,
      type: n.type || "custom",
      position: n.position || { x: 0, y: 0 },
      data: n.data || {},
    }));
    this.state.edges = data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || null,
      targetHandle: e.targetHandle || null,
      type: e.type || "statusEdge",
      data: e.data || {},
    }));
    this.saveToDisk();
  }

  close() {
    this.saveToDisk();
  }
}
