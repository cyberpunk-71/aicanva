# ARCHITECTURE DECISION RECORDS (ADR)

> Major structural decisions, trade-offs considered, and rationale.

---

## ADR-001: Monorepo with pnpm Workspaces

**Date:** 2026-08-24
**Status:** Accepted

### Context
Need to manage three interconnected packages (canvas frontend, gateway server, skybridge MCP) with shared TypeScript config and coordinated dev/build scripts.

### Decision
Use pnpm workspaces with a flat structure: `apps/*` for frontend packages and `server/` for the backend.

### Alternatives Considered
- **Turborepo:** Overkill for 3 packages; adds build complexity.
- **Nx:** Heavy tooling overhead for this scope.
- **Separate repos:** Would complicate shared types and coordinated releases.

### Consequences
- Single `pnpm install` at root installs all dependencies.
- Shared `tsconfig.base.json` ensures consistent TypeScript config.
- Each package has independent `package.json` for isolated dependency management.

---

## ADR-002: ReactFlow for Canvas Engine

**Date:** 2026-08-24
**Status:** Accepted

### Context
Need an infinite 2D canvas with pan/zoom, node dragging, edge connections, minimap, and custom node rendering.

### Decision
Use `@xyflow/react` (React Flow v12) as the canvas engine.

### Alternatives Considered
- **Custom canvas with HTML5 Canvas API:** Too much low-level work for pan/zoom/interaction.
- **Konva.js / React-Konva:** Good for drawing but lacks built-in node/edge graph semantics.
- **Excalidraw:** Whiteboard-focused, not designed for structured node graphs.
- **Tldraw:** Similar to Excalidraw; less suited for programmatic node management.

### Consequences
- Built-in support for custom nodes, edges, minimap, controls.
- Well-documented API with active community.
- Slight bundle size overhead (~150KB gzipped).

---

## ADR-003: Zustand for Client State Management

**Date:** 2026-08-24
**Status:** Accepted

### Context
Need lightweight state management for canvas nodes, edges, viewport, and UI preferences.

### Decision
Use Zustand with persist middleware.

### Alternatives Considered
- **Redux Toolkit:** More boilerplate; overkill for this use case.
- **Jotai:** Atomic model doesn't fit the relational node/edge graph well.
- **React Context:** Performance issues with frequent canvas updates.
- **Valtio:** Proxy-based; less predictable with ReactFlow's render cycle.

### Consequences
- Minimal boilerplate, excellent TypeScript support.
- `persist` middleware for localStorage UI prefs.
- Server remains source of truth for canvas data (SQLite).

---

## ADR-004: Express + ws for Gateway Server

**Date:** 2026-08-24
**Status:** Accepted

### Context
Need an HTTP server with WebSocket support for real-time canvas state sync and MCP endpoint exposure.

### Decision
Use Express for HTTP routes and `ws` library for WebSocket.

### Alternatives Considered
- **Fastify:** Faster but less ecosystem for MCP integration patterns.
- **Socket.io:** Adds overhead; raw WebSockets suffice with our reconnect logic.
- **Hono:** Lightweight but less mature ecosystem.

### Consequences
- Simple, well-understood stack.
- Easy to add SSE support via Express response streaming.
- `ws` gives fine-grained control over WebSocket connections.

---

## ADR-005: SQLite for Persistence

**Date:** 2026-08-24
**Status:** Accepted

### Context
Need persistent storage for canvas state (nodes, edges, metadata) that survives server restarts.

### Decision
Use `better-sqlite3` for file-based SQLite storage.

### Alternatives Considered
- **JSON file:** Simple but no concurrent access safety.
- **PostgreSQL:** Overkill for single-user canvas state.
- **Redis:** In-memory; adds operational complexity for persistence.

### Consequences
- Zero-config database; file at `./data/canvas.db`.
- Synchronous API simplifies code (no async/await for DB calls).
- Single-writer limitation is acceptable for this use case.

---

## ADR-006: Iframe Isolation for Skybridge Widgets

**Date:** 2026-08-24
**Status:** Accepted

### Context
Skybridge MCP tools return React view bundles that need to render inside canvas nodes without CSS/JS conflicts.

### Decision
Render Skybridge views in sandboxed iframes using blob URLs, with a `postMessage` JSON-RPC bridge for communication.

### Alternatives Considered
- **Direct React rendering in same tree:** CSS conflicts, style leakage, z-index issues.
- **Web Components / Shadow DOM:** React doesn't natively compose well into Shadow DOM.
- **Micro-frontends (Module Federation):** Over-engineered for 3 views.

### Consequences
- Complete style isolation.
- Requires pointer-events overlay to prevent iframe from capturing canvas interactions.
- postMessage bridge adds communication latency (~1ms per message).
