import React, { useState, useCallback } from "react";

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingViewProps {
  date: string;
  slots: TimeSlot[];
  onSlotSelect?: (date: string, time: string, selected: boolean) => void;
}

export function BookingView({ date, slots, onSlotSelect }: BookingViewProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const handleSlotClick = useCallback(
    (slot: TimeSlot) => {
      if (!slot.available) return;

      const newSelected = selectedSlot === slot.time ? null : slot.time;
      setSelectedSlot(newSelected);
      onSlotSelect?.(date, slot.time, newSelected !== null);
    },
    [selectedSlot, date, onSlotSelect]
  );

  const availableCount = slots.filter((s) => s.available).length;

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
      <h3 style={{ color: "#f59e0b", marginBottom: 4, fontSize: 14 }}>📅 Time Slot Picker</h3>
      <div style={{ color: "#64748b", fontSize: 12, marginBottom: 12 }}>
        {date} • {availableCount} slots available
      </div>

      {/* Slots grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {slots.map((slot) => {
          const isSelected = selectedSlot === slot.time;
          let bg = "rgba(100, 116, 139, 0.05)";
          let border = "rgba(100, 116, 139, 0.2)";
          let color = "#475569";
          let cursor = "not-allowed";

          if (isSelected) {
            bg = "#f59e0b";
            border = "#f59e0b";
            color = "#12121e";
            cursor = "pointer";
          } else if (slot.available) {
            bg = "rgba(245, 158, 11, 0.05)";
            border = "rgba(245, 158, 11, 0.3)";
            color = "#f59e0b";
            cursor = "pointer";
          }

          return (
            <div
              key={slot.time}
              onClick={() => handleSlotClick(slot)}
              style={{
                padding: "10px 8px",
                border: `1px solid ${border}`,
                borderRadius: 8,
                textAlign: "center",
                cursor,
                transition: "all 0.15s",
                fontSize: 12,
                fontWeight: isSelected ? 700 : 500,
                background: bg,
                color,
                boxShadow: isSelected ? "0 0 12px rgba(245, 158, 11, 0.3)" : "none",
                textDecoration: !slot.available && !isSelected ? "line-through" : "none",
              }}
            >
              {slot.time}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 12,
          fontSize: 10,
          color: "#64748b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }}
          />
          Available
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            style={{ width: 8, height: 8, borderRadius: "50%", background: "#475569" }}
          />
          Unavailable
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#f59e0b",
              boxShadow: "0 0 4px #f59e0b",
            }}
          />
          Selected
        </div>
      </div>
    </div>
  );
}

export default BookingView;
