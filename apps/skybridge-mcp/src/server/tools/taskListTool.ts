interface TaskItem {
  id: string;
  label: string;
  done: boolean;
}

interface TaskListResult {
  data: {
    title: string;
    items: TaskItem[];
    totalItems: number;
    completedItems: number;
    progress: number;
    generatedAt: string;
  };
  viewHtml: string;
}

export function taskListTool(
  title: string,
  items: Array<{ id: string; label: string; done?: boolean }>
): TaskListResult {
  const taskItems: TaskItem[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    done: item.done || false,
  }));

  const completedItems = taskItems.filter((i) => i.done).length;
  const progress =
    taskItems.length > 0 ? Math.round((completedItems / taskItems.length) * 100) : 0;

  const viewHtml = generateTaskListViewHtml(title, taskItems, progress);

  return {
    data: {
      title,
      items: taskItems,
      totalItems: taskItems.length,
      completedItems,
      progress,
      generatedAt: new Date().toISOString(),
    },
    viewHtml,
  };
}

function generateTaskListViewHtml(
  title: string,
  items: TaskItem[],
  progress: number
): string {
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
    h3 { color: #a78bfa; margin-bottom: 12px; font-size: 14px; }
    .progress-bar {
      width: 100%;
      height: 6px;
      background: #1a1a2e;
      border-radius: 3px;
      margin-bottom: 12px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #a78bfa);
      border-radius: 3px;
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 8px;
    }
    .task-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
      margin: 2px 0;
    }
    .task-item:hover { background: rgba(167, 139, 250, 0.1); }
    .checkbox {
      width: 16px;
      height: 16px;
      border: 2px solid #4a4a6a;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .task-item.done .checkbox {
      background: #6366f1;
      border-color: #6366f1;
    }
    .task-item.done .checkbox::after {
      content: '✓';
      color: white;
      font-size: 10px;
      font-weight: bold;
    }
    .task-item.done .label {
      text-decoration: line-through;
      color: #4a5568;
    }
    .label { font-size: 13px; }
  </style>
</head>
<body>
  <h3>📋 ${title}</h3>
  <div class="progress-text">${progress}% complete</div>
  <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
  <div id="tasks"></div>
  <script>
    const items = ${JSON.stringify(items)};
    const container = document.getElementById('tasks');
    function render() {
      container.innerHTML = '';
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'task-item' + (item.done ? ' done' : '');
        div.innerHTML = '<div class="checkbox"></div><span class="label">' + item.label + '</span>';
        div.addEventListener('click', () => {
          item.done = !item.done;
          window.parent.postMessage({
            jsonrpc: '2.0',
            method: 'taskToggle',
            params: { id: item.id, done: item.done }
          }, '*');
          render();
        });
        container.appendChild(div);
      });
    }
    render();
  </script>
</body>
</html>`;
}
