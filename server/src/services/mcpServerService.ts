import { CanvasStateService } from "./canvasStateService.js";

interface McpToolCall {
  tool: string;
  arguments: Record<string, unknown>;
}

interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * MCP Server Service — exposes canvas manipulation tools over HTTP/SSE.
 * Tools: get_canvas_state, create_canvas_card, update_canvas_card, link_canvas_cards
 */
export class McpServerService {
  private canvasState: CanvasStateService;

  constructor(canvasState: CanvasStateService) {
    this.canvasState = canvasState;
  }

  getTools() {
    return [
      {
        name: "get_canvas_state",
        description: "Returns the current state of all nodes and edges on the canvas",
        inputSchema: {
          type: "object" as const,
          properties: {},
          required: [],
        },
      },
      {
        name: "create_canvas_card",
        description: "Creates a new card/node on the canvas",
        inputSchema: {
          type: "object" as const,
          properties: {
            type: {
              type: "string",
              enum: ["chat", "skybridge", "research", "code", "scratchpad"],
              description: "Type of card to create",
            },
            label: {
              type: "string",
              description: "Display label for the card",
            },
            data: {
              type: "object",
              description: "Additional data for the card",
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
              },
              description: "Position on the canvas (auto-placed if omitted)",
            },
          },
          required: ["type"],
        },
      },
      {
        name: "update_canvas_card",
        description: "Updates an existing card/node on the canvas",
        inputSchema: {
          type: "object" as const,
          properties: {
            id: {
              type: "string",
              description: "ID of the node to update",
            },
            data: {
              type: "object",
              description: "Data fields to update",
            },
          },
          required: ["id", "data"],
        },
      },
      {
        name: "link_canvas_cards",
        description: "Creates an edge/connection between two cards",
        inputSchema: {
          type: "object" as const,
          properties: {
            source: {
              type: "string",
              description: "Source node ID",
            },
            target: {
              type: "string",
              description: "Target node ID",
            },
            data: {
              type: "object",
              description: "Edge data (e.g., { status: 'running' })",
            },
          },
          required: ["source", "target"],
        },
      },
    ];
  }

  async callTool(call: McpToolCall): Promise<McpToolResult> {
    try {
      switch (call.tool) {
        case "get_canvas_state": {
          const state = this.canvasState.getState();
          return { success: true, data: state };
        }

        case "create_canvas_card": {
          const { type, label, data, position } = call.arguments as {
            type: string;
            label?: string;
            data?: Record<string, unknown>;
            position?: { x: number; y: number };
          };
          const node = this.canvasState.createNode({
            type,
            data: { label: label || `${type} Node`, type, ...data },
            position,
          });
          return { success: true, data: node };
        }

        case "update_canvas_card": {
          const { id, data } = call.arguments as {
            id: string;
            data: Record<string, unknown>;
          };
          this.canvasState.updateNode(id, data);
          return { success: true, data: { id, updated: true } };
        }

        case "link_canvas_cards": {
          const { source, target, data } = call.arguments as {
            source: string;
            target: string;
            data?: Record<string, unknown>;
          };
          const edge = this.canvasState.createEdge({ source, target, data });
          return { success: true, data: edge };
        }

        default:
          return { success: false, error: `Unknown tool: ${call.tool}` };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}
