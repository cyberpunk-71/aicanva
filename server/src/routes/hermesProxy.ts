import { Router, Request, Response } from "express";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const HERMES_WORKSPACE = "/home/hermes/workspace";
const HERMES_CLI = "sudo -u hermes HERMES_HOME=/home/hermes/.hermes/profiles/iva /home/hermes/.hermes/hermes-agent/venv/bin/python -m hermes_cli.main";

export const hermesProxy = Router();

/**
 * POST /api/hermes/chat — Send a message to Hermes via CLI
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

  const canvasContext = `CANVAS WORKSPACE CONTEXT:
You are on an infinite canvas at http://100.86.244.6:5173.
When creating visual content, save as self-contained HTML in /home/hermes/workspace/
The canvas auto-detects HTML files and renders them as interactive cards.
Always mention the exact filename when creating files.
For real-time data, use WebSocket at ws://100.86.244.6:3001/ws or fetch from http://100.86.244.6:3001/`;

  try {
    const fullMessage = `${canvasContext}\n\nUser: ${message}`;
    const escapedMsg = fullMessage.replace(/'/g, "'\\''").replace(/"/g, '\\"');
    const cmd = `${HERMES_CLI} --continue -z "${escapedMsg}" 2>&1`;

    const result = execSync(cmd, {
      timeout: 300000, // 5 minutes
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 20,
    });

    const response = result.trim();

    // Auto-detect HTML file creation
    let detectedFile = null;

    // Pattern 1: Full path
    const fullPathMatch = response.match(/(\/home\/hermes\/workspace\/[^\s\n`'"]+\.html)/i);
    if (fullPathMatch) {
      const filepath = fullPathMatch[1];
      if (fs.existsSync(filepath)) {
        detectedFile = { filename: path.basename(filepath), filepath };
      }
    }

    // Pattern 2: "Created: filename.html"
    if (!detectedFile) {
      const nameMatch = response.match(/(?:Created|Saved|Wrote|Generated|Built|File|Output|Report)[:\s]+(?:`)?([a-zA-Z0-9_\-]+\.html)(?:`)?/i);
      if (nameMatch) {
        const filepath = path.join(HERMES_WORKSPACE, nameMatch[1]);
        if (fs.existsSync(filepath)) {
          detectedFile = { filename: nameMatch[1], filepath };
        }
      }
    }

    // Pattern 3: Scan for recent files
    if (!detectedFile) {
      try {
        const files = fs.readdirSync(HERMES_WORKSPACE);
        const recentFiles = files
          .filter(f => f.endsWith('.html'))
          .map(f => ({
            name: f,
            path: path.join(HERMES_WORKSPACE, f),
            mtime: fs.statSync(path.join(HERMES_WORKSPACE, f)).mtimeMs,
          }))
          .filter(f => Date.now() - f.mtime < 120000)
          .sort((a, b) => b.mtime - a.mtime);

        if (recentFiles.length > 0) {
          detectedFile = { filename: recentFiles[0].name, filepath: recentFiles[0].path };
        }
      } catch {}
    }

    res.write(`data: ${JSON.stringify({ type: "message", content: response })}\n\n`);

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
  } catch (err: any) {
    const isTimeout = err?.message?.includes('ETIMEDOUT') || err?.code === 'ETIMEDOUT';
    const output = err?.stdout || err?.stderr || err?.message || "Unknown error";

    // Even on timeout, check for recent files
    let detectedFile = null;
    try {
      const files = fs.readdirSync(HERMES_WORKSPACE);
      const recentFiles = files
        .filter(f => f.endsWith('.html'))
        .map(f => ({
          name: f,
          path: path.join(HERMES_WORKSPACE, f),
          mtime: fs.statSync(path.join(HERMES_WORKSPACE, f)).mtimeMs,
        }))
        .filter(f => Date.now() - f.mtime < 300000)
        .sort((a, b) => b.mtime - a.mtime);

      if (recentFiles.length > 0) {
        detectedFile = { filename: recentFiles[0].name, filepath: recentFiles[0].path };
      }
    } catch {}

    if (isTimeout) {
      res.write(`data: ${JSON.stringify({
        type: "message",
        content: `Hermes is taking longer than expected (timeout after 5 minutes). It may still be working.\n\n${detectedFile ? `But I found a recently created file: ${detectedFile.filename}` : 'No recent files detected.'}`
      })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({
        type: "error",
        content: `Hermes error:\n${output.substring(0, 500)}`
      })}\n\n`);
    }

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
  }
});

/**
 * POST /api/hermes/edit-html — Edit an existing HTML card via Hermes
 */
hermesProxy.post("/edit-html", async (req: Request, res: Response) => {
  const { filename, instruction, node_id } = req.body;

  if (!filename || !instruction) {
    return res.status(400).json({ error: "Missing filename or instruction" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const filepath = path.join(HERMES_WORKSPACE, filename);

  try {
    let currentHtml = "";
    if (fs.existsSync(filepath)) {
      currentHtml = fs.readFileSync(filepath, "utf-8");
    }

    const editPrompt = `Edit the HTML file at ${filepath} based on this instruction: "${instruction}"

Current file content (first 2000 chars):
${currentHtml.substring(0, 2000)}

Save the updated file to the same path. Preserve existing functionality while applying changes.`;

    const escapedPrompt = editPrompt.replace(/'/g, "'\\''").replace(/"/g, '\\"');
    const cmd = `${HERMES_CLI} --continue -z "${escapedPrompt}" 2>&1`;

    const result = execSync(cmd, {
      timeout: 300000,
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 20,
    });

    let updatedHtml = "";
    if (fs.existsSync(filepath)) {
      updatedHtml = fs.readFileSync(filepath, "utf-8");
    }

    res.write(`data: ${JSON.stringify({ type: "message", content: result.trim() })}\n\n`);

    if (updatedHtml && updatedHtml !== currentHtml) {
      res.write(`data: ${JSON.stringify({
        type: "auto_card",
        filename,
        html: updatedHtml.substring(0, 200000),
      })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err: any) {
    const output = err?.stdout || err?.stderr || err?.message || "Unknown error";
    res.write(`data: ${JSON.stringify({
      type: "error",
      content: `Edit error:\n${output.substring(0, 500)}`
    })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/hermes/new-session — Reset session
 */
hermesProxy.post("/new-session", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

/**
 * GET /api/hermes/files — List recent HTML files
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
 * POST /api/hermes/create-card — Manually create a card
 */
hermesProxy.post("/create-card", (req: Request, res: Response) => {
  const { filepath, filename } = req.body;
  const targetPath = filepath || path.join(HERMES_WORKSPACE, filename);

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: `File not found: ${targetPath}` });
  }

  try {
    const html = fs.readFileSync(targetPath, "utf-8");
    res.json({ ok: true, filename: path.basename(targetPath), html: html.substring(0, 200000) });
  } catch {
    res.status(500).json({ error: "Failed to read file" });
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
