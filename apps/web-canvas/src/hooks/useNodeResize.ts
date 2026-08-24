import { useState, useCallback, useRef, useEffect } from "react";

interface ResizeState {
  width: number;
  height: number;
  isResizing: boolean;
}

export function useNodeResize(initialWidth: number, initialHeight: number, minWidth = 300, minHeight = 200) {
  const [size, setSize] = useState<ResizeState>({
    width: initialWidth,
    height: initialHeight,
    isResizing: false,
  });
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height,
    };

    setSize(prev => ({ ...prev, isResizing: true }));

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;

      setSize({
        width: Math.max(minWidth, startRef.current.w + dx),
        height: Math.max(minHeight, startRef.current.h + dy),
        isResizing: true,
      });
    };

    const handleMouseUp = () => {
      setSize(prev => ({ ...prev, isResizing: false }));
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [size.width, size.height, minWidth, minHeight]);

  const setWidth = useCallback((w: number) => {
    setSize(prev => ({ ...prev, width: Math.max(minWidth, w) }));
  }, [minWidth]);

  const setHeight = useCallback((h: number) => {
    setSize(prev => ({ ...prev, height: Math.max(minHeight, h) }));
  }, [minHeight]);

  return {
    width: size.width,
    height: size.height,
    isResizing: size.isResizing,
    handleResizeStart,
    setWidth,
    setHeight,
  };
}
