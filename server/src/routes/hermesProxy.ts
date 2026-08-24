import { Router, Request, Response } from "express";
import { execSync } from "child_process";

export const hermesProxy = Router();

/**
 * POST /api/hermes/chat — Send a message to Hermes via CLI
 * Hermes Web UI at :8080 requires auth, so we use the CLI directly.
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

  try {
    // Use Hermes CLI with -z flag for prompt
    const escapedMsg = message.replace(/'/g, "'\\''");
    const contextPrefix = context ? `[Canvas Context: ${context.substring(0, 200)}]\n\n` : "";
    const fullPrompt = contextPrefix + escapedMsg;

    const result = execSync(
      `sudo -u hermes HERMES_HOME=/home/hermes/.hermes/profiles/iva /home/hermes/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main -z '${fullPrompt}' 2>&1`,
      { timeout: 120000, encoding: "utf-8", maxBuffer: 1024 * 1024 * 10 }
    );

    res.write(`data: ${JSON.stringify({ type: "message", content: result.trim() })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    // Extract useful output from stderr if available
    const output = (err as any)?.stdout || (err as any)?.stderr || errMsg;

    res.write(`data: ${JSON.stringify({
      type: "error",
      content: `Hermes CLI error:\n${output.substring(0, 500)}\n\nTry running manually:\nsudo -u hermes HERMES_HOME=/home/hermes/.hermes/profiles/iva /home/hermes/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main -z "hello"`
    })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/hermes/status — Check Hermes connectivity
 */
hermesProxy.get("/status", async (_req: Request, res: Response) => {
  const results: Record<string, unknown> = {};

  // Check systemd service
  try {
    const status = execSync("systemctl is-active hermes-gateway-iva 2>/dev/null || echo inactive", { encoding: "utf-8" }).trim();
    results.systemd = { active: status === "active", status };
  } catch {
    results.systemd = { active: false, status: "unknown" };
  }

  // Check process
  try {
    const ps = execSync("pgrep -f 'hermes.*gateway' || echo none", { encoding: "utf-8" }).trim();
    results.process = { running: ps !== "none", pids: ps };
  } catch {
    results.process = { running: false };
  }

  // Check Web UI
  try {
    const r = await fetch("http://localhost:8080/", { signal: AbortSignal.timeout(3000), redirect: "manual" });
    results.web_ui = { ok: true, status: r.status, note: "Requires browser login" };
  } catch {
    results.web_ui = { ok: false };
  }

  // Test CLI
  try {
    const test = execSync(
      `sudo -u hermes HERMES_HOME=/home/hermes/.hermes/profiles/iva /home/hermes/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main status 2>&1 | head -5`,
      { timeout: 10000, encoding: "utf-8" }
    );
    results.cli = { ok: true, output: test.trim() };
  } catch (e) {
    results.cli = { ok: false, error: "CLI failed" };
  }

  res.json(results);
});
