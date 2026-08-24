import { Router, Request, Response } from "express";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const HERMES_WORKSPACE = "/home/hermes/workspace";
const HERMES_CLI = "sudo -u hermes HERMES_HOME=/home/hermes/.hermes/profiles/iva /home/hermes/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main";

export const hermesProxy = Router();

// Track sessions per node
const nodeSessions: Map<string, string> = new Map();

/**
 * POST /api/hermes/chat — Send a message to Hermes via CLI
 * Maintains session context per node_id
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

  // Canvas context — only sent on first message of a session
  const sessionId = node_id ? nodeSessions.get(node_id) : null;
  const isNewSession = !sessionId;

  const canvasContext = isNewSession ? `CANVAS WORKSPACE — You are on an infinite canvas at http://100.86.244.6:5173.
When creating visual/interactive content, save it as a self-contained HTML file in /home/hermes/workspace/ with a descriptive filename.
The canvas auto-detects HTML files you create and renders them as interactive cards.
Always mention the exact filename when you create a file.` : '';

  try {
    // Build command with session continuity
    let cmd = HERMES_CLI;

    if (sessionId) {
      // Resume existing session
      cmd += ` --resume ${sessionId}`;
    } else if (node_id) {
      // New session — use --continue to pick up last session or start fresh
      cmd += ` --continue`;
    }

    const fullMessage = canvasContext
      ? `${canvasContext}\n\nUser: ${message}`
      : message;

    const escapedMsg = fullMessage.replace(/'/g, "'\\''");
    cmd += ` -z '${escapedMsg}' 2>&1`;

    const result = execSync(cmd, {
      timeout: 180000,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 10,
    });

    const response = result.trim();

    // Extract session ID from output if present
    const sessionMatch = response.match(/session[:\s]+([a-zA-Z0-9_-]+)/i);
    if (sessionMatch && node_id) {
      nodeSessions.set(node_id, sessionMatch[1]);
    }

    // Auto-detect HTML file creation — multiple patterns
    const htmlPatterns = [
      /(?:created?|saved?|wrote?|generated?|built?|wrote)\s+(?:a\s+)?(?:new\s+)?(?:file|html|report|dashboard|chart|visualization)[:\s]+(?:`)?(?:\/home\/hermes\/workspace\/)?([^\s\n`]+\.(?:html|htm))(?:`)?/i,
      /(?:File|Output|Report|Dashboard|HTML)[:\s]+(?:`)?(?:\/home\/hermes\/workspace\/)?([^\s\n`]+\.(?:html|htm))(?:`)?/i,
      /(?:`)?\/home\/hermes\/workspace\/([^\s\n`]+\.(?:html|htm))(?:`)?/i,
      /([a-zA-Z0-9_-]+\.(?:html|htm))/i,
    ];

    let detectedFile = null;
    for (const pattern of htmlPatterns) {
      const match = response.match(pattern);
      if (match) {
        const filename = match[1];
        const filepath = path.join(HERMES_WORKSPACE, filename);
        if (fs.existsSync(filepath)) {
          detectedFile = { filename, filepath };
          break;
        }
      }
    }

    // Also scan workspace for recently created HTML files (last 60 seconds)
    if (!detectedFile) {
      try {
        const files = fs.readdirSync(HERMES_WORKSPACE);
        const recentFiles = files
          .filter(f => f.endsWith('.html') || f.endsWith('.htm'))
          .map(f => ({
            name: f,
            path: path.join(HERMES_WORKSPACE, f),
            mtime: fs.statSync(path.join(HERMES_WORKSPACE, f)).mtimeMs,
          }))
          .filter(f => Date.now() - f.mtime < 60000) // Created in last 60 seconds
          .sort((a, b) => b.mtime - a.mtime);

        if (recentFiles.length > 0) {
          detectedFile = { filename: recentFiles[0].name, filepath: recentFiles[0].path };
        }
      } catch {}
    }

    // Send response
    res.write(`data: ${JSON.stringify({ type: "message", content: response })}\n\n`);

    // If we detected an HTML file, send it for auto-card creation
    if (detectedFile) {
      try {
        const htmlContent = fs.readFileSync(detectedFile.filepath, "utf-8");
        res.write(`data: ${JSON.stringify({
          type: "auto_card",
          filename: detectedFile.filename,
          html: htmlContent.substring(0, 200000),
        })}\n\n`);
      } catch {}
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
 * POST /api/hermes/new-session — Reset session for a node
 */
hermesProxy.post("/new-session", (req: Request, res: Response) => {
  const { node_id } = req.body;
  if (node_id) {
    nodeSessions.delete(node_id);
  }
  res.json({ ok: true });
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
