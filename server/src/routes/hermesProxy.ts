import { Router, Request, Response } from "express";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const HERMES_WORKSPACE = "/home/hermes/workspace";

export const hermesProxy = Router();

/**
 * POST /api/hermes/chat — Send a message to Hermes via CLI
 * with canvas-aware context injection
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

  // Strong canvas context
  const canvasContext = `CRITICAL CANVAS WORKSPACE CONTEXT:
You are responding to a user on a CANVAS WORKSPACE at http://100.86.244.6:5173.

When the user asks to CREATE, BUILD, VISUALIZE, or SHOW anything:
1. Create a self-contained HTML file in /home/hermes/workspace/
2. The canvas will auto-detect the HTML file and render it as an interactive card

For VISUAL content (charts, dashboards, simulations, reports):
- Create a single self-contained HTML file with inline CSS and JS
- The canvas renders full HTML in iframes (scripts work)
- Use modern CSS, inline SVG, Chart.js CDN, etc.

Available MCP canvas tools (if running in gateway mode):
- mcp__canvas_workspace__create_canvas_card(type, label, data, position, link_to)
- mcp__canvas_workspace__update_canvas_card(id, data)
- mcp__canvas_workspace__link_canvas_cards(source, target)

Card types: chat, code, research, scratchpad, skybridge
${context ? `\nAdditional: ${context}` : ''}`;

  try {
    const escapedCtx = canvasContext.replace(/'/g, "'\\''").replace(/\n/g, "\\n");
    const escapedMsg = message.replace(/'/g, "'\\''").replace(/\n/g, "\\n");

    const result = execSync(
      `sudo -u hermes HERMES_HOME=/home/hermes/.hermes/profiles/iva /home/hermes/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main -z '${escapedCtx}\\n\\nUser: ${escapedMsg}' 2>&1`,
      { timeout: 180000, encoding: "utf-8", maxBuffer: 1024 * 1024 * 10 }
    );

    const response = result.trim();

    // Auto-detect HTML file creation
    const htmlFileMatch = response.match(/(?:created?|saved?|wrote?|generated?|built?).*?(?:file|html).*?[:\s]+(?:\/home\/hermes\/workspace\/)?([^\s\n]+\.(?:html|htm))/i);
    let autoCard = null;

    if (htmlFileMatch) {
      const filename = htmlFileMatch[1];
      const filepath = path.join(HERMES_WORKSPACE, filename);
      if (fs.existsSync(filepath)) {
        const htmlContent = fs.readFileSync(filepath, "utf-8");
        autoCard = { filename, filepath, htmlContent: htmlContent.substring(0, 100000) };
      }
    }

    res.write(`data: ${JSON.stringify({ type: "message", content: response })}\n\n`);

    if (autoCard) {
      res.write(`data: ${JSON.stringify({
        type: "auto_card",
        filename: autoCard.filename,
        html: autoCard.htmlContent,
      })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    const output = (err as any)?.stdout || (err as any)?.stderr || (err instanceof Error ? err.message : "Unknown");
    res.write(`data: ${JSON.stringify({
      type: "error",
      content: `Hermes error:\n${output.substring(0, 1000)}`
    })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  }
});

/**
 * GET /api/hermes/status
 */
hermesProxy.get("/status", async (_req: Request, res: Response) => {
  const results: Record<string, unknown> = {};
  try {
    const status = execSync("systemctl is-active hermes-gateway-iva 2>/dev/null || echo inactive", { encoding: "utf-8" }).trim();
    results.systemd = { active: status === "active", status };
  } catch { results.systemd = { active: false }; }
  try {
    const ps = execSync("pgrep -f 'hermes.*gateway' || echo none", { encoding: "utf-8" }).trim();
    results.process = { running: ps !== "none" };
  } catch { results.process = { running: false }; }
  res.json(results);
});
