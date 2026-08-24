import React, { useState, useCallback } from "react";

interface TaskItem {
  id: string;
  label: string;
  done: boolean;
}

interface TaskListViewProps {
  title: string;
  items: TaskItem[];
  onTaskToggle?: (id: string, done: boolean) => void;
}

export function TaskListView({ title, items: initialItems, onTaskToggle }: TaskListViewProps) {
  const [items, setItems] = useState<TaskItem[]>(initialItems);

  const completedCount = items.filter((i) => i.done).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  const handleToggle = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            const newDone = !item.done;
            onTaskToggle?.(id, newDone);
            return { ...item, done: newDone };
          }
          return item;
        })
      );
    },
    [onTaskToggle]
  );

  return (
    <div
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#12121e",
        color: "#94a3b8",
        padding: 16,
        fontSize: 13,
      }}
    >
      <h3 style={{ color: "#a78bfa", marginBottom: 12, fontSize: 14 }}>📋 {title}</h3>

      {/* Progress bar */}
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
        {progress}% complete ({completedCount}/{items.length})
      </div>
      <div
        style={{
          width: "100%",
          height: 6,
          background: "#1a1a2e",
          borderRadius: 3,
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #6366f1, #a78bfa)",
            borderRadius: 3,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Task items */}
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => handleToggle(item.id)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 8px",
            borderRadius: 6,
            cursor: "pointer",
            transition: "background 0.15s",
            margin: "2px 0",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(167, 139, 250, 0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              border: `2px solid ${item.done ? "#6366f1" : "#4a4a6a"}`,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              background: item.done ? "#6366f1" : "transparent",
              transition: "all 0.15s",
            }}
          >
            {item.done && (
              <span style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>✓</span>
            )}
          </div>
          <span
            style={{
              fontSize: 13,
              textDecoration: item.done ? "line-through" : "none",
              color: item.done ? "#4a5568" : "#94a3b8",
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default TaskListView;
