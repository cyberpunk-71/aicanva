import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { canvasRoutes } from "./routes/canvasRoutes.js";
import { mcpRoutes } from "./routes/mcpRoutes.js";
import { CanvasStateService } from "./services/canvasStateService.js";
import { StorageService } from "./services/storageService.js";
import { McpServerService } from "./services/mcpServerService.js";

const PORT = parseInt(process.env.PORT || "3001", 10);
const HOST = process.env.HOST || "0.0.0.0";

// Initialize services
const storage = new StorageService();
const canvasState = new CanvasStateService(storage);
const mcpServer = new McpServerService(canvasState);

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: "/ws" });

// WebSocket connection handler
wss.on("connection", (ws: WebSocket) => {
  console.log("[Gateway] New WebSocket client connected");

  // Send current canvas state on connect
  const state = canvasState.getState();
  ws.send(JSON.stringify({ type: "canvas:state", payload: state }));

  ws.on("message", (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.type) {
        case "canvas:create-node": {
          const node = canvasState.createNode(msg.payload);
          broadcastToAll(wss, { type: "canvas:create-node", payload: node }, ws);
          break;
        }
        case "canvas:update-node": {
          canvasState.updateNode(msg.payload.id, msg.payload.data);
          broadcastToAll(wss, msg, ws);
          break;
        }
        case "canvas:move-node": {
          canvasState.updateNodePosition(msg.payload.id, msg.payload.position);
          broadcastToAll(wss, msg, ws);
          break;
        }
        case "canvas:delete-node": {
          canvasState.deleteNode(msg.payload.id);
          broadcastToAll(wss, msg, ws);
          break;
        }
        case "canvas:create-edge": {
          const edge = canvasState.createEdge(msg.payload);
          broadcastToAll(wss, { type: "canvas:create-edge", payload: edge }, ws);
          break;
        }
        case "canvas:delete-edge": {
          canvasState.deleteEdge(msg.payload.id);
          broadcastToAll(wss, msg, ws);
          break;
        }
        default:
          console.log("[Gateway] Unknown WS message type:", msg.type);
      }
    } catch (err) {
      console.error("[Gateway] WS message parse error:", err);
    }
  });

  ws.on("close", () => {
    console.log("[Gateway] WebSocket client disconnected");
  });
});

// Broadcast helper
function broadcastToAll(
  wss: WebSocketServer,
  message: object,
  exclude?: WebSocket
) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Make broadcast available to routes
app.locals.broadcast = (message: object) => broadcastToAll(wss, message);
app.locals.canvasState = canvasState;
app.locals.mcpServer = mcpServer;

// Routes
app.use("/api/canvas", canvasRoutes);
app.use("/", mcpRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Start server
server.listen(PORT, HOST, () => {
  console.log(`[Gateway] Server running at http://${HOST}:${PORT}`);
  console.log(`[Gateway] WebSocket at ws://${HOST}:${PORT}/ws`);
  console.log(`[Gateway] MCP HTTP at http://${HOST}:${PORT}/mcp`);
  console.log(`[Gateway] MCP SSE at http://${HOST}:${PORT}/sse`);
});

export { app, server, wss };
