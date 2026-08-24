import { Router, Request, Response } from "express";

const HERMES_API = process.env.HERMES_API_BASE || "http://localhost:8080/v1";

export const hermesProxy = Router();

/**
 * POST /api/hermes/chat — Send a message to Hermes and stream the response
 * Body: { message: string, context?: string, node_id?: string }
 */
hermesProxy.post("/chat", async (req: Request, res: Response) => {
  const { message, context, node_id } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Missing 'message' field" });
  }

  // Set up SSE for streaming response
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    // Try Hermes API
    const response = await fetch(`${HERMES_API}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          ...(context ? [{ role: "system", content: context }] : []),
          { role: "user", content: message },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      // Fallback: try direct hermes CLI
      const { execSync } = await import("child_process");
      try {
        const result = execSync(
          `sudo -u hermes HERMES_HOME=/home/hermes/.hermes/profiles/iva /home/hermes/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main --profile iva chat "${message.replace(/"/g, '\\"')}"`,
          { timeout: 60000, encoding: "utf-8" }
        );
        res.write(`data: ${JSON.stringify({ type: "message", content: result.trim() })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
      } catch (cliErr) {
        res.write(`data: ${JSON.stringify({ type: "error", content: "Hermes is not available. Start Hermes gateway first." })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
        res.end();
      }
      return;
    }

    // Stream the response
    const reader = response.body?.getReader();
    if (!reader) {
      res.write(`data: ${JSON.stringify({ type: "error", content: "No response body" })}\n\n`);
      res.end();
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
            res.end();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              res.write(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`);
            }
          } catch {}
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    res.write(
      `data: ${JSON.stringify({ type: "error", content: `Connection error: ${err instanceof Error ? err.message : "Unknown"}` })}\n\n`
    );
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/hermes/status — Check if Hermes is reachable
 */
hermesProxy.get("/status", async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${HERMES_API}/models`, {
      signal: AbortSignal.timeout(3000),
    });
    res.json({ connected: true, status: response.status });
  } catch {
    res.json({ connected: false, api: HERMES_API });
  }
});
