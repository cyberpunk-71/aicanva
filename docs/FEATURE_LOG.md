# FEATURE LOG

> Chronological registry of implemented capabilities, components, API routes, and MCP tools.

---

## Phase 1: Monorepo & Governance (2026-08-24)

### Infrastructure
- **pnpm workspace** with `apps/*` and `server/` packages
- **Shared tsconfig.base.json** with path aliases
- **Governance docs**: AGENT_HANDOFF.md, FEATURE_LOG.md, ERROR_LOG.md, DECISIONS.md

---

## Phase 2: Skybridge MCP Tools (2026-08-24)

### MCP Tools

#### `research_tree`
- **Description:** Generates an interactive collapsible tree/mind map for research topics
- **Input:** `{ topic: string, depth?: number }`
- **Output:** Structured JSON tree + bundled `ResearchView.tsx` React component
- **View:** `ResearchView.tsx` — collapsible tree with click-to-expand nodes, color-coded depth levels

#### `interactive_checklist`
- **Description:** Creates an interactive task checklist with live status tracking
- **Input:** `{ title: string, items: Array<{ id: string, label: string, done?: boolean }> }`
- **Output:** Task list JSON + bundled `TaskListView.tsx` React component
- **View:** `TaskListView.tsx` — checkboxes with strikethrough on completion, progress bar, dispatches status events

#### `time_slot_picker`
- **Description:** Visual time slot picker for scheduling/booking
- **Input:** `{ date: string, slots: Array<{ time: string, available: boolean }> }`
- **Output:** Slot data JSON + bundled `BookingView.tsx` React component
- **View:** `BookingView.tsx` — visual calendar grid, clickable available slots, selected state highlight

---

## Phase 3: Gateway Server (2026-08-24)

### REST API Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/canvas` | Get full canvas state (nodes + edges) |
| POST | `/api/canvas/export` | Export canvas as JSON |
| POST | `/api/canvas/import` | Import canvas from JSON |
| POST | `/mcp` | MCP HTTP endpoint for tool invocation |
| GET | `/sse` | MCP SSE endpoint for streaming |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `canvas:state` | Server→Client | Full canvas state sync on connect |
| `canvas:create-node` | Bidirectional | Create a new node |
| `canvas:update-node` | Bidirectional | Update node data/position |
| `canvas:delete-node` | Bidirectional | Remove a node |
| `canvas:create-edge` | Bidirectional | Connect two nodes |
| `canvas:delete-edge` | Bidirectional | Remove an edge |

### MCP Tools (Server-side)

| Tool | Description |
|------|-------------|
| `get_canvas_state` | Returns current nodes and edges |
| `create_canvas_card` | Creates a new card on the canvas |
| `update_canvas_card` | Updates an existing card |
| `link_canvas_cards` | Creates an edge between two cards |

---

## Phase 4: Canvas Frontend (2026-08-24)

### Components

#### Canvas Infrastructure
- **CanvasViewport.tsx** — Main ReactFlow canvas with grid background, minimap, controls
- **CanvasToolbar.tsx** — Toolbar for adding nodes, auto-layout, clear, export
- **Minimap.tsx** — Minimap overlay for navigation
- **StatusEdge.tsx** — Animated gradient edge with states: idle, running, success, error

#### Custom Nodes
- **GenericChatNode.tsx** — Agent-agnostic chat card with message list, streaming indicator, tool badges
- **SkybridgeNode.tsx** — Iframe container for MCP widget views with postMessage bridge
- **ResearchNode.tsx** — Interactive tree/mind map visualization card
- **CodePreviewNode.tsx** — Dual-pane Monaco editor + live preview sandbox
- **ScratchpadNode.tsx** — Markdown note card with live preview

### State Management
- **canvasStore.ts** — Zustand store for nodes, edges, viewport state, and undo/redo

### Hooks
- **useCanvasSocket.ts** — WebSocket connection with auto-reconnect and state sync
- **usePostMessageBridge.ts** — Bidirectional JSON-RPC bridge for iframe communication

---

## Phase 5: Synchronization & Polish (2026-08-24)

### Event Sync
- WebSocket state synchronization between frontend and gateway
- postMessage bridge for iframe ↔ canvas communication
- Pointer-events overlay to disable iframe mouse capture during pan/zoom

### Edge Animations
- StatusEdge with CSS gradient animation
- Color states: gray (idle), blue pulse (running), green (success), red (error)

---

## Phase 6: Topology A Deployment Automation (2026-08-24)

### Deployment Scripts

#### `scripts/setup-topology-a.sh`
- **Description:** Full VPS deployment automation script
- **Capabilities:**
  - Installs Node.js 20+ and pnpm if missing
  - Builds all workspace packages for production
  - Installs and configures PM2 process manager
  - Starts canvas-gateway (port 3001) and canvas-frontend (port 5173)
  - Generates `.env` and Hermes integration configs
  - Configures PM2 startup for reboot persistence
- **Usage:** `chmod +x scripts/setup-topology-a.sh && ./scripts/setup-topology-a.sh`

#### `scripts/configure-hermes.sh`
- **Description:** Generates Hermes/Eva MCP integration config files
- **Output:**
  - `config/hermes-canvas.yaml` — YAML config for Hermes config.yaml
  - `config/hermes-canvas.json` — JSON config for mcp_servers.json
  - `config/canvas.env` — Environment variables
- **Usage:** `chmod +x scripts/configure-hermes.sh && ./scripts/configure-hermes.sh`

### PM2 Configuration

#### `pm2.config.js`
- **Services managed:**
  1. `canvas-gateway` — Express+WS server on port 3001
  2. `canvas-frontend` — Vite preview server on port 5173
- **Features:** Auto-restart, memory limits, log rotation, boot persistence

### Hermes/Eva Integration

#### `server/src/config/hermesConfig.ts`
- **Description:** TypeScript module for generating Hermes MCP configs programmatically
- **Exports:** `generateHermesConfig()`, `generateYamlConfig()`, `generateJsonConfig()`
- **MCP Servers configured:**
  - `canvas_workspace` — HTTP transport to `http://localhost:3001/mcp`
  - `skybridge_tools` — stdio transport to Skybridge MCP server

### Documentation

#### `docs/TOPOLOGY_A_SETUP.md`
- Complete step-by-step deployment guide
- Firewall configuration (ufw)
- Hermes/Eva integration instructions
- Nginx reverse proxy with SSL setup
- Troubleshooting section
- File locations reference table
