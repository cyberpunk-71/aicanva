#!/usr/bin/env bash
# ============================================================================
# Hermes / Eva Integration Config Generator
#
# Generates ready-to-paste configuration snippets for connecting
# Hermes Agent or Eva to the Canvas Workspace Gateway.
#
# Usage:
#   chmod +x scripts/configure-hermes.sh
#   ./scripts/configure-hermes.sh [--output-dir ./config]
#
# Output:
#   - hermes-canvas.yaml  (paste into Hermes config.yaml)
#   - hermes-canvas.json  (use as mcp_servers.json)
#   - .env                (environment variables)
# ============================================================================

set -euo pipefail

# --- Configuration ---
WORKSPACE_ROOT="${WORKSPACE_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
GATEWAY_PORT="${PORT:-3001}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
OUTPUT_DIR="${1:-${WORKSPACE_ROOT}/config}"
HERMES_API_BASE="${HERMES_API_BASE:-http://localhost:8080/v1}"

# --- Colors ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()   { echo -e "${GREEN}[OK]${NC}    $*"; }

# --- Detect VPS IP ---
VPS_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_VPS_IP")

echo ""
echo "============================================"
echo "  Hermes / Eva Config Generator"
echo "  Canvas Core Workspace — Topology A"
echo "============================================"
echo ""

mkdir -p "$OUTPUT_DIR"

# --- Generate YAML config ---
YAML_FILE="${OUTPUT_DIR}/hermes-canvas.yaml"
cat > "$YAML_FILE" << EOF
# ============================================================
# Canvas Workspace MCP Configuration for Hermes/Eva
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Topology: A (All-on-VPS)
# ============================================================
#
# USAGE: Paste the mcp_servers section below into your
# Hermes config.yaml file, or save this file and reference it.
#
# Then restart Hermes to pick up the new MCP servers.
# ============================================================

mcp_servers:
  # Canvas Gateway — HTTP MCP endpoint for canvas manipulation tools
  # Tools: get_canvas_state, create_canvas_card, update_canvas_card, link_canvas_cards
  canvas_workspace:
    url: "http://localhost:${GATEWAY_PORT}/mcp"
    transport: "http"

  # Skybridge MCP — stdio-based MCP server for full-stack tools
  # Tools: research_tree, interactive_checklist, time_slot_picker
  skybridge_tools:
    command: "node"
    args: ["${WORKSPACE_ROOT}/apps/skybridge-mcp/dist/server/index.js"]

# Canvas Gateway direct endpoints (for custom integrations)
canvas_gateway:
  base_url: "http://localhost:${GATEWAY_PORT}"
  websocket_url: "ws://localhost:${GATEWAY_PORT}/ws"
  mcp_http_url: "http://localhost:${GATEWAY_PORT}/mcp"
  mcp_sse_url: "http://localhost:${GATEWAY_PORT}/sse"
  api_url: "http://localhost:${GATEWAY_PORT}/api/canvas"

# Remote access (from your laptop browser)
remote_access:
  frontend_url: "http://${VPS_IP}:${FRONTEND_PORT}"
  gateway_url: "http://${VPS_IP}:${GATEWAY_PORT}"
EOF

log_ok "YAML config: ${YAML_FILE}"

# --- Generate JSON config ---
JSON_FILE="${OUTPUT_DIR}/hermes-canvas.json"
cat > "$JSON_FILE" << EOF
{
  "mcp_servers": {
    "canvas_workspace": {
      "name": "canvas_workspace",
      "transport": "http",
      "url": "http://localhost:${GATEWAY_PORT}/mcp",
      "description": "Canvas manipulation tools via HTTP MCP"
    },
    "skybridge_tools": {
      "name": "skybridge_tools",
      "transport": "stdio",
      "command": "node",
      "args": ["${WORKSPACE_ROOT}/apps/skybridge-mcp/dist/server/index.js"],
      "description": "Skybridge full-stack MCP tools (research, checklists, booking)"
    }
  },
  "canvas_gateway": {
    "base_url": "http://localhost:${GATEWAY_PORT}",
    "websocket_url": "ws://localhost:${GATEWAY_PORT}/ws",
    "mcp_http_url": "http://localhost:${GATEWAY_PORT}/mcp",
    "mcp_sse_url": "http://localhost:${GATEWAY_PORT}/sse",
    "api_url": "http://localhost:${GATEWAY_PORT}/api/canvas"
  },
  "remote_access": {
    "frontend_url": "http://${VPS_IP}:${FRONTEND_PORT}",
    "gateway_url": "http://${VPS_IP}:${GATEWAY_PORT}"
  }
}
EOF

log_ok "JSON config: ${JSON_FILE}"

# --- Generate .env file ---
ENV_FILE="${OUTPUT_DIR}/canvas.env"
cat > "$ENV_FILE" << EOF
# Canvas Core Workspace — Environment Variables
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Topology: A (All-on-VPS)

# Gateway Server
PORT=${GATEWAY_PORT}
HOST=0.0.0.0
NODE_ENV=production

# Frontend
FRONTEND_PORT=${FRONTEND_PORT}
VITE_GATEWAY_URL=ws://localhost:${GATEWAY_PORT}
VITE_API_URL=http://localhost:${GATEWAY_PORT}

# Persistence
DB_PATH=./data/canvas.json

# Hermes / Eva
HERMES_API_BASE=${HERMES_API_BASE}
WORKSPACE_ROOT=${WORKSPACE_ROOT}
EOF

log_ok "Environment file: ${ENV_FILE}"

# --- Print summary ---
echo ""
echo "============================================"
echo "  ✅ Configuration files generated!"
echo "============================================"
echo ""
echo "  Files created in: ${OUTPUT_DIR}/"
echo "    • hermes-canvas.yaml  — Paste mcp_servers into Hermes config.yaml"
echo "    • hermes-canvas.json  — Use as mcp_servers.json"
echo "    • canvas.env          — Environment variables"
echo ""
echo "  Quick test (after services are running):"
echo "    curl http://localhost:${GATEWAY_PORT}/health"
echo "    curl http://localhost:${GATEWAY_PORT}/mcp/tools"
echo ""
echo "  Canvas MCP tools available:"
echo "    • get_canvas_state    — Read current nodes and edges"
echo "    • create_canvas_card  — Spawn a new card on the canvas"
echo "    • update_canvas_card  — Update card data"
echo "    • link_canvas_cards   — Connect two cards with an edge"
echo ""
echo "  Skybridge MCP tools available:"
echo "    • research_tree         — Generate interactive mind maps"
echo "    • interactive_checklist — Create task checklists"
echo "    • time_slot_picker      — Visual booking/scheduling"
echo ""
echo "============================================"
