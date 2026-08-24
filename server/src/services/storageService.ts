import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DB_PATH || "./data/canvas.db";

export class StorageService {
  private db: Database.Database;

  constructor() {
    // Ensure data directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(DB_PATH);
    this.db.pragma("journal_mode = WAL");
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        position_x REAL NOT NULL DEFAULT 0,
        position_y REAL NOT NULL DEFAULT 0,
        data TEXT NOT NULL DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS edges (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        target TEXT NOT NULL,
        source_handle TEXT,
        target_handle TEXT,
        type TEXT DEFAULT 'statusEdge',
        data TEXT DEFAULT '{}',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  }

  // Node operations
  getNodes(): Array<{
    id: string;
    type: string;
    position_x: number;
    position_y: number;
    data: string;
  }> {
    return this.db.prepare("SELECT * FROM nodes ORDER BY created_at").all() as any[];
  }

  saveNode(node: {
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }) {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO nodes (id, type, position_x, position_y, data, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        node.id,
        node.type,
        node.position.x,
        node.position.y,
        JSON.stringify(node.data)
      );
  }

  deleteNode(id: string) {
    this.db.prepare("DELETE FROM nodes WHERE id = ?").run(id);
    this.db.prepare("DELETE FROM edges WHERE source = ? OR target = ?").run(id, id);
  }

  // Edge operations
  getEdges(): Array<{
    id: string;
    source: string;
    target: string;
    source_handle: string | null;
    target_handle: string | null;
    type: string;
    data: string;
  }> {
    return this.db.prepare("SELECT * FROM edges ORDER BY created_at").all() as any[];
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
    this.db
      .prepare(
        `INSERT OR REPLACE INTO edges (id, source, target, source_handle, target_handle, type, data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        edge.id,
        edge.source,
        edge.target,
        edge.sourceHandle || null,
        edge.targetHandle || null,
        edge.type || "statusEdge",
        JSON.stringify(edge.data || {})
      );
  }

  deleteEdge(id: string) {
    this.db.prepare("DELETE FROM edges WHERE id = ?").run(id);
  }

  // Export/Import
  exportAll(): { nodes: any[]; edges: any[] } {
    return {
      nodes: this.getNodes().map((n) => ({
        id: n.id,
        type: "custom",
        position: { x: n.position_x, y: n.position_y },
        data: JSON.parse(n.data),
      })),
      edges: this.getEdges().map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.source_handle,
        targetHandle: e.target_handle,
        type: e.type,
        data: JSON.parse(e.data),
      })),
    };
  }

  importAll(data: { nodes: any[]; edges: any[] }) {
    const insertNode = this.db.prepare(
      `INSERT OR REPLACE INTO nodes (id, type, position_x, position_y, data) VALUES (?, ?, ?, ?, ?)`
    );
    const insertEdge = this.db.prepare(
      `INSERT OR REPLACE INTO edges (id, source, target, source_handle, target_handle, type, data) VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const transaction = this.db.transaction(() => {
      // Clear existing data
      this.db.prepare("DELETE FROM nodes").run();
      this.db.prepare("DELETE FROM edges").run();

      for (const node of data.nodes) {
        insertNode.run(
          node.id,
          node.type || "custom",
          node.position?.x || 0,
          node.position?.y || 0,
          JSON.stringify(node.data || {})
        );
      }

      for (const edge of data.edges) {
        insertEdge.run(
          edge.id,
          edge.source,
          edge.target,
          edge.sourceHandle || null,
          edge.targetHandle || null,
          edge.type || "statusEdge",
          JSON.stringify(edge.data || {})
        );
      }
    });

    transaction();
  }

  close() {
    this.db.close();
  }
}
