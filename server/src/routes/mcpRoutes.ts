import { Router, Request, Response } from "express";
import { McpServerService } from "../services/mcpServerService.js";

export const mcpRoutes = Router();

// POST /mcp — MCP HTTP endpoint for tool invocation and JSON-RPC 2.0 (Streamable HTTP)
mcpRoutes.post("/mcp", async (req: Request, res: Response) => {
  const mcpServer: McpServerService = req.app.locals.mcpServer;
  const broadcast: (msg: object) => void = req.app.locals.broadcast;

  try {
    const body = req.body;

    // Handle MCP JSON-RPC 2.0 requests
    if (body && typeof body === "object" && ("method" in body || "jsonrpc" in body)) {
      const { method, params, id } = body;

      // 1. Initialize
      if (method === "initialize") {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: params?.protocolVersion || "2024-11-05",
            capabilities: {
              tools: {
                listChanged: false,
              },
            },
            serverInfo: {
              name: "canvas_workspace",
              version: "1.0.0",
            },
          },
        });
      }

      // 2. Notifications (e.g. notifications/initialized) - no response content needed
      if (method?.startsWith("notifications/") || id === undefined || id === null) {
        return res.status(200).json({ jsonrpc: "2.0" });
      }

      // 3. Ping
      if (method === "ping") {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {},
        });
      }

      // 4. Tools list
      if (method === "tools/list") {
        return res.json({
          jsonrpc: "2.0",
          id,
          result: {
            tools: mcpServer.getTools(),
          },
        });
      }

      // 5. Tools call
      if (method === "tools/call") {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          return res.status(400).json({
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Missing tool name in params" },
          });
        }

        const result = await mcpServer.callTool({ tool: toolName, arguments: toolArgs });

        // Broadcast to WebSocket clients on canvas changes
        if (toolName === "create_canvas_card" && result.success) {
          broadcast({ type: "canvas:create-node", payload: result.data });
        } else if (toolName === "update_canvas_card" && result.success) {
          broadcast({
            type: "canvas:update-node",
            payload: { id: toolArgs.id, data: toolArgs.data },
          });
        } else if (toolName === "link_canvas_cards" && result.success) {
          broadcast({ type: "canvas:create-edge", payload: result.data });
        }

        if (result.success) {
          return res.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: typeof result.data === "string" ? result.data : JSON.stringify(result.data, null, 2),
                },
              ],
              isError: false,
            },
          });
        } else {
          return res.json({
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: result.error || "Tool execution failed",
                },
              ],
              isError: true,
            },
          });
        }
      }

      // Unknown JSON-RPC method
      return res.status(404).json({
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
    }

    // Direct / legacy format: { tool: "...", arguments: { ... } }
    const { tool, arguments: args } = body;

    if (!tool) {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32600, message: "Missing 'tool' or 'method' field" },
        id: req.body?.id,
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

    return res.json({
      jsonrpc: "2.0",
      result: result.data,
      error: result.error ? { code: -32603, message: result.error } : undefined,
      id: req.body?.id,
    });
  } catch (err) {
    return res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: err instanceof Error ? err.message : "Internal error",
      },
      id: req.body?.id,
    });
  }
});

// GET /mcp/tools — List available MCP tools (REST endpoint)
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

  // Send MCP SSE endpoint discovery event
  res.write("event: endpoint\ndata: /mcp\n\n");

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
