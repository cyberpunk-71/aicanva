interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingResult {
  data: {
    date: string;
    slots: TimeSlot[];
    availableCount: number;
    generatedAt: string;
  };
  viewHtml: string;
}

export function bookingTool(
  date: string,
  slots: Array<{ time: string; available: boolean }>
): BookingResult {
  const availableCount = slots.filter((s) => s.available).length;
  const viewHtml = generateBookingViewHtml(date, slots);

  return {
    data: {
      date,
      slots,
      availableCount,
      generatedAt: new Date().toISOString(),
    },
    viewHtml,
  };
}

function generateBookingViewHtml(date: string, slots: TimeSlot[]): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Inter, system-ui, sans-serif;
      background: #12121e;
      color: #94a3b8;
      padding: 16px;
      font-size: 13px;
    }
    h3 { color: #f59e0b; margin-bottom: 4px; font-size: 14px; }
    .date { color: #64748b; font-size: 12px; margin-bottom: 12px; }
    .slots-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .slot {
      padding: 10px 8px;
      border: 1px solid #2a2a3e;
      border-radius: 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s;
      font-size: 12px;
      font-weight: 500;
    }
    .slot.available {
      background: rgba(245, 158, 11, 0.05);
      border-color: rgba(245, 158, 11, 0.3);
      color: #f59e0b;
    }
    .slot.available:hover {
      background: rgba(245, 158, 11, 0.15);
      border-color: #f59e0b;
      transform: scale(1.02);
    }
    .slot.unavailable {
      background: rgba(100, 116, 139, 0.05);
      border-color: rgba(100, 116, 139, 0.2);
      color: #475569;
      cursor: not-allowed;
      text-decoration: line-through;
    }
    .slot.selected {
      background: #f59e0b;
      border-color: #f59e0b;
      color: #12121e;
      font-weight: 700;
      box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);
    }
    .legend {
      display: flex;
      gap: 12px;
      margin-top: 12px;
      font-size: 10px;
      color: #64748b;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .legend-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
  </style>
</head>
<body>
  <h3>📅 Time Slot Picker</h3>
  <div class="date">${date}</div>
  <div class="slots-grid" id="slots"></div>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background: #f59e0b;"></div> Available</div>
    <div class="legend-item"><div class="legend-dot" style="background: #475569;"></div> Unavailable</div>
    <div class="legend-item"><div class="legend-dot" style="background: #f59e0b; box-shadow: 0 0 4px #f59e0b;"></div> Selected</div>
  </div>
  <script>
    const slots = ${JSON.stringify(slots)};
    let selectedSlot = null;
    const container = document.getElementById('slots');
    function render() {
      container.innerHTML = '';
      slots.forEach(slot => {
        const div = document.createElement('div');
        const isSelected = selectedSlot === slot.time;
        let cls = 'slot ';
        if (isSelected) cls += 'selected';
        else if (slot.available) cls += 'available';
        else cls += 'unavailable';
        div.className = cls;
        div.textContent = slot.time;
        if (slot.available) {
          div.addEventListener('click', () => {
            selectedSlot = isSelected ? null : slot.time;
            window.parent.postMessage({
              jsonrpc: '2.0',
              method: 'slotSelect',
              params: { date: '${date}', time: slot.time, selected: !isSelected }
            }, '*');
            render();
          });
        }
        container.appendChild(div);
      });
    }
    render();
  </script>
</body>
</html>`;
}
