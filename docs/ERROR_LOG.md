# ERROR LOG — Bug & Solution Knowledge Base

> Track every bug/error encountered with root cause, fix, and prevention guideline.

---

| # | Error / Symptom | Root Cause | Exact Solution / Fix Applied | Prevention Guideline |
|---|----------------|------------|------------------------------|---------------------|
| 1 | ReactFlow nodes overlap on auto-placement | Default `addNodes` places at (0,0) | Implemented `getNonOverlappingPosition()` in canvasStateService that scans existing node positions and finds next open slot using grid-based collision detection | Always use the auto-placement helper when creating nodes programmatically |
| 2 | WebSocket connection drops on hot-reload during dev | Vite HMR triggers full page reload, causing WS reconnect storm | Added exponential backoff (1s→2s→4s, max 10s) in useCanvasSocket with jitter and a `isManualClose` guard | Always implement reconnect backoff for WebSocket hooks |
| 3 | SSE stream sends malformed JSON | Express `res.write()` needs `\n\n` delimiter for SSE format | Ensured all SSE messages follow `data: ${JSON.stringify(msg)}\n\n` format with proper Content-Type `text/event-stream` | Use a dedicated SSE helper function for all stream writes |
| 4 | Iframe captures all mouse events, blocking canvas pan/zoom | Pointer events pass through to iframe during drag | Added transparent overlay div with `pointer-events: auto` that appears on canvas interaction start and hides on interaction end | Always wrap iframes in a container with event interception layer |
| 5 | Zustand store not persisting across page refresh | Store was in-memory only | Added `zustand/middleware` persist with localStorage adapter for UI prefs; canvas data persists via SQLite on server | Distinguish between client-side UI state and server-side data state |
| 6 | Monaco editor CSP violations in iframe | Content Security Policy blocks inline scripts | Configured Vite to set `frame-src blob:` and `worker-src blob:` in dev server headers | Pre-configure CSP headers for any iframe-embedding scenario |
| 7 | StatusEdge gradient animation not visible | SVG gradient needs `gradientUnits="userSpaceOnUse"` | Set explicit gradient coordinates and added CSS `@keyframes` for stroke-dashoffset animation | Test SVG gradients with actual node positions, not just default viewport |
| 8 | pnpm workspace hoisting causes version conflicts | Shared dependencies resolved to incompatible versions | Added `.npmrc` with `shamefully-hoist=false` and explicit version pins in each package.json | Use strict pnpm resolution; avoid shamefully-hoist |
