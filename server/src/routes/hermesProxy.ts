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

    // Auto-detect HTML file creation — very broad patterns
    const htmlPatterns = [
      // "Created: /home/hermes/workspace/file.html"
      /(?:Created|Saved|Wrote|Generated|Built|Output|File|Report)[:\s]+(?:`)?(\/home\/hermes\/workspace\/[^\s\n`]+\.html)(?:`)?/i,
      // "/home/hermes/workspace/file.html" anywhere in text
      /(\/home\/hermes\/workspace\/[^\s\n`]+\.html)/i,
      // "file.html" with context
      /(?:file|html|report|dashboard|chart)[:\s]+(?:`)?([a-zA-Z0-9_-]+\.html)(?:`)?/i,
      // Any .html filename at end of line
      /([a-zA-Z0-9_-]+\.html)\s*$/im,
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
 * POST /api/hermes/create-card — Manually create a card from an HTML file
 */
hermesProxy.post("/create-card", (req: Request, res: Response) => {
  const { filepath, filename } = req.body;

  const targetPath = filepath || path.join(HERMES_WORKSPACE, filename);

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: `File not found: ${targetPath}` });
  }

  try {
    const html = fs.readFileSync(targetPath, "utf-8");
    res.json({
      ok: true,
      filename: path.basename(targetPath),
      html: html.substring(0, 200000),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to read file" });
  }
});

/**
 * GET /api/hermes/files — List recent HTML files in Hermes workspace
 */
hermesProxy.get("/files", (_req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(HERMES_WORKSPACE)
      .filter(f => f.endsWith('.html') || f.endsWith('.htm'))
      .map(f => ({
        name: f,
        path: path.join(HERMES_WORKSPACE, f),
        size: fs.statSync(path.join(HERMES_WORKSPACE, f)).size,
        modified: fs.statSync(path.join(HERMES_WORKSPACE, f)).mtime,
      }))
      .sort((a, b) => b.modified.getTime() - a.modified.getTime())
      .slice(0, 20);
    res.json({ files });
  } catch {
    res.json({ files: [] });
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
