import { Router, Request, Response } from "express";
import { McpServerService } from "../services/mcpServerService.js";

export const mcpRoutes = Router();

// POST /mcp — MCP HTTP endpoint for tool invocation
mcpRoutes.post("/mcp", async (req: Request, res: Response) => {
  const mcpServer: McpServerService = req.app.locals.mcpServer;
  const broadcast: (msg: object) => void = req.app.locals.broadcast;

  try {
    const { tool, arguments: args } = req.body;

    if (!tool) {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Missing 'tool' field" },
        id: req.body.id,
      });
    }

    const result = await mcpServer.callTool({ tool, arguments: args || {} });

    // If a node was created, broadcast it to WebSocket clients
    if (tool === "create_canvas_card" && result.success) {
      broadcast({ type: "canvas:create-node", payload: result.data });
    } else if (tool === "update_canvas_card" && result.success) {
      broadcast({
        type: "canvas:update-node",
        payload: { id: args.id, data: args.data },
      });
    } else if (tool === "link_canvas_cards" && result.success) {
      broadcast({ type: "canvas:create-edge", payload: result.data });
    }

    res.json({
      jsonrpc: "2.0",
      result: result.data,
      error: result.error ? { code: -32603, message: result.error } : undefined,
      id: req.body.id,
    });
  } catch (err) {
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : "Internal error",
      },
      id: req.body.id,
    });
  }
});

// GET /mcp/tools — List available MCP tools
mcpRoutes.get("/mcp/tools", (_req: Request, res: Response) => {
  const mcpServer: McpServerService = _req.app.locals.mcpServer;
  res.json({ tools: mcpServer.getTools() });
});

// GET /sse — MCP SSE endpoint for streaming
mcpRoutes.get("/sse", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Send initial connection event
  const connectEvent = {
    type: "connection",
    message: "Connected to Canvas MCP SSE stream",
    timestamp: new Date().toISOString(),
  };
  res.write(`data: ${JSON.stringify(connectEvent)}\n\n`);

  // Keep-alive heartbeat every 30 seconds
  const heartbeat = setInterval(() => {
    const beat = { type: "heartbeat", timestamp: new Date().toISOString() };
    res.write(`data: ${JSON.stringify(beat)}\n\n`);
  }, 30000);

  // Listen for canvas state changes and stream them
  const broadcast: (msg: object) => void = req.app.locals.broadcast;

  // Override broadcast to also send to this SSE client
  const originalBroadcast = broadcast;
  const sseBroadcast = (message: object) => {
    originalBroadcast(message);
    res.write(`data: ${JSON.stringify(message)}\n\n`);
  };
  req.app.locals.broadcast = sseBroadcast;

  req.on("close", () => {
    clearInterval(heartbeat);
    req.app.locals.broadcast = originalBroadcast;
    console.log("[SSE] Client disconnected");
  });
});

// POST /sse — MCP SSE tool invocation (POST-based SSE)
mcpRoutes.post("/sse", async (req: Request, res: Response) => {
  const mcpServer: McpServerService = req.app.locals.mcpServer;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const { tool, arguments: args } = req.body;
    const result = await mcpServer.callTool({ tool, arguments: args || {} });

    res.write(`data: ${JSON.stringify({ type: "tool_result", ...result })}\n\n`);
    res.end();
  } catch (err) {
    res.write(
      `data: ${JSON.stringify({ type: "error", message: err instanceof Error ? err.message : "Unknown error" })}\n\n`
    );
    res.end();
  }
});
