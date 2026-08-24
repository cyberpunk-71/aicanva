import { Router, Request, Response } from "express";
import { execSync } from "child_process";

const HERMES_API = process.env.HERMES_API_BASE || "http://localhost:8080/v1";

export const hermesProxy = Router();

/**
 * POST /api/hermes/chat — Send a message to Hermes
 * Tries multiple connection methods:
 * 1. HTTP API at HERMES_API_BASE
 * 2. Hermes CLI via sudo
 * 3. Direct socket/IPC if available
 */
hermesProxy.post("/chat", async (req: Request, res: Response) => {
  const { message, context, node_id } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Missing 'message' field" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // Method 1: Try HTTP API
  try {
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
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const reader = response.body?.getReader();
      if (reader) {
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
        return;
      }
    }
  } catch (e) {
    // Fall through to method 2
  }

  // Method 2: Try Hermes CLI
  try {
    const escapedMsg = message.replace(/"/g, '\\"').replace(/\n/g, "\\n");
    const result = execSync(
      `sudo -u hermes HERMES_HOME=/home/hermes/.hermes/profiles/iva /home/hermes/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main --profile iva chat "${escapedMsg}" 2>&1`,
      { timeout: 120000, encoding: "utf-8", maxBuffer: 1024 * 1024 * 5 }
    );
    res.write(`data: ${JSON.stringify({ type: "message", content: result.trim() })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
    return;
  } catch (cliErr) {
    // Fall through to error
  }

  // Method 3: All methods failed
  res.write(`data: ${JSON.stringify({
    type: "error",
    content: `Cannot reach Hermes. Tried:\n• HTTP API at ${HERMES_API}\n• Hermes CLI\n\nTo fix:\n1. Check if Hermes is running: sudo systemctl status hermes-gateway-iva\n2. Start it: sudo systemctl start hermes-gateway-iva\n3. Check logs: sudo journalctl -u hermes-gateway-iva -f`
  })}\n\n`);
  res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  res.end();
});

/**
 * GET /api/hermes/status — Check Hermes connectivity
 */
hermesProxy.get("/status", async (_req: Request, res: Response) => {
  const results: Record<string, unknown> = {};

  // Check HTTP API
  try {
    const r = await fetch(`${HERMES_API}/models`, { signal: AbortSignal.timeout(3000) });
    results.http_api = { ok: true, status: r.status, url: HERMES_API };
  } catch (e) {
    results.http_api = { ok: false, url: HERMES_API, error: "Connection refused" };
  }

  // Check systemd service
  try {
    const status = execSync("systemctl is-active hermes-gateway-iva 2>/dev/null || echo inactive", { encoding: "utf-8" }).trim();
    results.systemd = { active: status === "active", status };
  } catch {
    results.systemd = { active: false, status: "unknown" };
  }

  // Check process
  try {
    const ps = execSync("pgrep -f hermes || echo none", { encoding: "utf-8" }).trim();
    results.process = { running: ps !== "none", pids: ps };
  } catch {
    results.process = { running: false };
  }

  res.json(results);
});
