import { useEffect, useRef, useCallback } from "react";
import { useCanvasStore, type CanvasNode, type CanvasEdge } from "../store/canvasStore";

const WS_URL = import.meta.env.VITE_GATEWAY_URL || "ws://localhost:3001";
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 10000];

export function useCanvasSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const isManualClose = useRef(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const { nodes, edges, updateNode, updateNodePosition } = useCanvasStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[CanvasSocket] Connected to gateway");
        reconnectAttempt.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case "canvas:state":
              // Full state sync from server
              useCanvasStore.setState({
                nodes: msg.payload.nodes || [],
                edges: msg.payload.edges || [],
              });
              break;

            case "canvas:create-node": {
              const store = useCanvasStore.getState();
              const existing = store.nodes.find((n) => n.id === msg.payload.id);
              if (!existing) {
                useCanvasStore.setState({
                  nodes: [...store.nodes, msg.payload as CanvasNode],
                });
              }
              break;
            }

            case "canvas:update-node":
              updateNode(msg.payload.id, msg.payload.data);
              break;

            case "canvas:move-node":
              updateNodePosition(msg.payload.id, msg.payload.position);
              break;

            case "canvas:delete-node":
              useCanvasStore.getState().deleteNode(msg.payload.id);
              break;

            case "canvas:create-edge": {
              const store = useCanvasStore.getState();
              const exists = store.edges.find((e) => e.id === msg.payload.id);
              if (!exists) {
                useCanvasStore.setState({
                  edges: [...store.edges, msg.payload as CanvasEdge],
                });
              }
              break;
            }

            case "canvas:delete-edge":
              useCanvasStore.setState({
                edges: useCanvasStore
                  .getState()
                  .edges.filter((e) => e.id !== msg.payload.id),
              });
              break;

            default:
              console.log("[CanvasSocket] Unknown message type:", msg.type);
          }
        } catch (err) {
          console.error("[CanvasSocket] Failed to parse message:", err);
        }
      };

      ws.onclose = (event) => {
        console.log("[CanvasSocket] Disconnected:", event.code, event.reason);
        wsRef.current = null;

        if (!isManualClose.current) {
          const delay =
            RECONNECT_DELAYS[
              Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)
            ];
          const jitter = delay * (0.5 + Math.random() * 0.5);
          console.log(
            `[CanvasSocket] Reconnecting in ${Math.round(jitter)}ms (attempt ${reconnectAttempt.current + 1})`
          );
          reconnectAttempt.current++;
          reconnectTimer.current = setTimeout(connect, jitter);
        }
      };

      ws.onerror = (error) => {
        console.error("[CanvasSocket] Error:", error);
      };
    } catch (err) {
      console.error("[CanvasSocket] Connection failed:", err);
    }
  }, [updateNode, updateNodePosition]);

  const send = useCallback((type: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  useEffect(() => {
    isManualClose.current = false;
    connect();

    return () => {
      isManualClose.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { send, isConnected: wsRef.current?.readyState === WebSocket.OPEN };
}
