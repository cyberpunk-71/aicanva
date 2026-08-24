import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from "@xyflow/react";
import { nanoid } from "nanoid";

export type NodeStatus = "idle" | "running" | "success" | "error";

export interface CanvasNode extends Node {
  data: {
    label: string;
    type: "chat" | "skybridge" | "research" | "code" | "scratchpad";
    status?: NodeStatus;
    content?: string;
    messages?: Array<{ role: string; content: string }>;
    [key: string]: unknown;
  };
}

export interface CanvasEdge extends Edge {
  data?: {
    status?: NodeStatus;
  };
}

interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;

  // Actions
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  addNode: (type: CanvasNode["data"]["type"], position?: { x: number; y: number }) => string;
  updateNode: (id: string, data: Partial<CanvasNode["data"]>) => void;
  deleteNode: (id: string) => void;
  updateNodePosition: (id: string, position: { x: number; y: number }) => void;
  setEdgeStatus: (edgeId: string, status: NodeStatus) => void;
  selectNode: (id: string | null) => void;
  clearCanvas: () => void;
  importState: (state: { nodes: CanvasNode[]; edges: CanvasEdge[] }) => void;
  getNonOverlappingPosition: (preferred?: { x: number; y: number }) => { x: number; y: number };
}

const NODE_WIDTH = 400;
const NODE_HEIGHT = 350;
const GRID_SIZE = 60;

function getNonOverlappingPosition(
  existingNodes: CanvasNode[],
  preferred?: { x: number; y: number }
): { x: number; y: number } {
  const pos = preferred || { x: 100, y: 100 };
  const occupied = existingNodes.map((n) => ({
    x: n.position.x,
    y: n.position.y,
    w: NODE_WIDTH,
    h: NODE_HEIGHT,
  }));

  let attempts = 0;
  while (attempts < 100) {
    const overlaps = occupied.some(
      (o) =>
        pos.x < o.x + o.w + GRID_SIZE &&
        pos.x + NODE_WIDTH + GRID_SIZE > o.x &&
        pos.y < o.y + o.h + GRID_SIZE &&
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

const defaultNodeData: Record<CanvasNode["data"]["type"], CanvasNode["data"]> = {
  chat: {
    label: "Chat Agent",
    type: "chat",
    status: "idle",
    messages: [],
    content: "",
  },
  skybridge: {
    label: "Skybridge Widget",
    type: "skybridge",
    status: "idle",
    widgetUrl: "",
  },
  research: {
    label: "Research Tree",
    type: "research",
    status: "idle",
    tree: null,
  },
  code: {
    label: "Code Preview",
    type: "code",
    status: "idle",
    code: '// Start coding here...\nconsole.log("Hello, Canvas!");',
    language: "typescript",
  },
  scratchpad: {
    label: "Notes",
    type: "scratchpad",
    content: "# Scratchpad\n\nWrite your notes here...",
  },
};

export const useCanvasStore = create<CanvasState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,

      onNodesChange: (changes) => {
        set({ nodes: applyNodeChanges(changes, get().nodes) as CanvasNode[] });
      },

      onEdgesChange: (changes) => {
        set({ edges: applyEdgeChanges(changes, get().edges) as CanvasEdge[] });
      },

      onConnect: (connection) => {
        const newEdge: CanvasEdge = {
          ...connection,
          id: `edge-${nanoid(8)}`,
          type: "statusEdge",
          animated: true,
          data: { status: "idle" },
        };
        set({ edges: addEdge(newEdge, get().edges) as CanvasEdge[] });
      },

      addNode: (type, position) => {
        const id = `node-${nanoid(8)}`;
        const pos = getNonOverlappingPosition(get().nodes, position);
        const newNode: CanvasNode = {
          id,
          type: "custom",
          position: pos,
          data: { ...defaultNodeData[type] },
        };
        set({ nodes: [...get().nodes, newNode] });
        return id;
      },

      updateNode: (id, data) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, ...data } } : n
          ),
        });
      },

      deleteNode: (id) => {
        set({
          nodes: get().nodes.filter((n) => n.id !== id),
          edges: get().edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
        });
      },

      updateNodePosition: (id, position) => {
        set({
          nodes: get().nodes.map((n) =>
            n.id === id ? { ...n, position } : n
          ),
        });
      },

      setEdgeStatus: (edgeId, status) => {
        set({
          edges: get().edges.map((e) =>
            e.id === edgeId ? { ...e, data: { ...e.data, status } } : e
          ),
        });
      },

      selectNode: (id) => set({ selectedNodeId: id }),

      clearCanvas: () => set({ nodes: [], edges: [], selectedNodeId: null }),

      importState: (state) =>
        set({ nodes: state.nodes, edges: state.edges, selectedNodeId: null }),

      getNonOverlappingPosition: (preferred) =>
        getNonOverlappingPosition(get().nodes, preferred),
    }),
    {
      name: "canvas-ui-prefs",
      partialize: (state) => ({
        // Only persist UI preferences, not full canvas data (that lives on server)
        selectedNodeId: state.selectedNodeId,
      }),
    }
  )
);
