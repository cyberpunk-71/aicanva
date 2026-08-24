import { useEffect, useRef, useCallback } from "react";

interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

type MessageHandler = (message: JsonRpcMessage) => void;

/**
 * Bidirectional JSON-RPC bridge for iframe ↔ canvas communication.
 * Used by SkybridgeNode to communicate with MCP widget views.
 */
export function usePostMessageBridge(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  handlers?: Record<string, (params: unknown) => unknown>
) {
  const pendingRequests = useRef<
    Map<string | number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }>
  >(new Map());
  const messageId = useRef(0);

  const handleIncoming = useCallback(
    (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

      const msg = event.data as JsonRpcMessage;
      if (!msg || msg.jsonrpc !== "2.0") return;

      // Handle response to our request
      if (msg.id && (msg.result !== undefined || msg.error)) {
        const pending = pendingRequests.current.get(msg.id);
        if (pending) {
          pendingRequests.current.delete(msg.id);
          if (msg.error) {
            pending.reject(new Error(msg.error.message));
          } else {
            pending.resolve(msg.result);
          }
        }
        return;
      }

      // Handle incoming method call from iframe
      if (msg.method && handlers?.[msg.method]) {
        try {
          const result = handlers[msg.method](msg.params);
          // Send response back to iframe
          const response: JsonRpcMessage = {
            jsonrpc: "2.0",
            id: msg.id,
            result,
          };
          iframeRef.current?.contentWindow?.postMessage(response, "*");
        } catch (err) {
          const errorResponse: JsonRpcMessage = {
            jsonrpc: "2.0",
            id: msg.id,
            error: {
              code: -32603,
              message: err instanceof Error ? err.message : "Internal error",
            },
          };
          iframeRef.current?.contentWindow?.postMessage(errorResponse, "*");
        }
      }
    },
    [iframeRef, handlers]
  );

  useEffect(() => {
    window.addEventListener("message", handleIncoming);
    return () => window.removeEventListener("message", handleIncoming);
  }, [handleIncoming]);

  /**
   * Send a JSON-RPC request to the iframe and await its response.
   */
  const call = useCallback(
    (method: string, params?: unknown): Promise<unknown> => {
      return new Promise((resolve, reject) => {
        const id = ++messageId.current;
        const msg: JsonRpcMessage = {
          jsonrpc: "2.0",
          id,
          method,
          params,
        };

        pendingRequests.current.set(id, { resolve, reject });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (pendingRequests.current.has(id)) {
            pendingRequests.current.delete(id);
            reject(new Error(`Request ${method} timed out`));
          }
        }, 10000);

        iframeRef.current?.contentWindow?.postMessage(msg, "*");
      });
    },
    [iframeRef]
  );

  /**
   * Send a JSON-RPC notification (no response expected) to the iframe.
   */
  const notify = useCallback(
    (method: string, params?: unknown) => {
      const msg: JsonRpcMessage = {
        jsonrpc: "2.0",
        method,
        params,
      };
      iframeRef.current?.contentWindow?.postMessage(msg, "*");
    },
    [iframeRef]
  );

  return { call, notify };
}
