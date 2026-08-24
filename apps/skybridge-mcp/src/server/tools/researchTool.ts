interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  expanded?: boolean;
}

interface ResearchResult {
  data: {
    topic: string;
    tree: TreeNode[];
    generatedAt: string;
  };
  viewHtml: string;
}

export function researchTreeTool(topic: string, depth: number): ResearchResult {
  // Generate a structured research tree
  const tree: TreeNode[] = [
    {
      id: "root",
      label: topic,
      expanded: true,
      children: [
        {
          id: "background",
          label: "Background & Context",
          expanded: depth > 1,
          children:
            depth > 1
              ? [
                  { id: "bg-history", label: "Historical Context" },
                  { id: "bg-current", label: "Current State" },
                  { id: "bg-key-players", label: "Key Players" },
                ]
              : undefined,
        },
        {
          id: "analysis",
          label: "Deep Analysis",
          expanded: depth > 1,
          children:
            depth > 1
              ? [
                  {
                    id: "ana-data",
                    label: "Data Sources",
                    expanded: depth > 2,
                    children:
                      depth > 2
                        ? [
                            { id: "data-primary", label: "Primary Sources" },
                            { id: "data-secondary", label: "Secondary Sources" },
                          ]
                        : undefined,
                  },
                  {
                    id: "ana-methods",
                    label: "Methodology",
                    expanded: depth > 2,
                    children:
                      depth > 2
                        ? [
                            { id: "meth-quant", label: "Quantitative" },
                            { id: "meth-qual", label: "Qualitative" },
                          ]
                        : undefined,
                  },
                  { id: "ana-findings", label: "Key Findings" },
                ]
              : undefined,
        },
        {
          id: "implications",
          label: "Implications",
          expanded: depth > 1,
          children:
            depth > 1
              ? [
                  { id: "imp-short", label: "Short-term Impact" },
                  { id: "imp-long", label: "Long-term Impact" },
                  { id: "imp-risks", label: "Risk Assessment" },
                ]
              : undefined,
        },
        {
          id: "conclusions",
          label: "Conclusions & Recommendations",
          children:
            depth > 2
              ? [
                  { id: "conc-summary", label: "Executive Summary" },
                  { id: "conc-actions", label: "Action Items" },
                ]
              : undefined,
        },
      ],
    },
  ];

  const viewHtml = generateResearchViewHtml(tree, topic);

  return {
    data: {
      topic,
      tree,
      generatedAt: new Date().toISOString(),
    },
    viewHtml,
  };
}

function generateResearchViewHtml(tree: TreeNode[], topic: string): string {
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
    h3 { color: #22d3ee; margin-bottom: 12px; font-size: 14px; }
    .tree-node { margin-left: 16px; }
    .node-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      margin: 2px 0;
      transition: background 0.15s;
    }
    .node-header:hover { background: rgba(34, 211, 238, 0.1); }
    .node-label { font-weight: 500; }
    .depth-0 .node-label { color: #22d3ee; }
    .depth-1 .node-label { color: #60a5fa; }
    .depth-2 .node-label { color: #a78bfa; }
    .depth-3 .node-label { color: #f472b6; }
    .chevron { font-size: 10px; width: 14px; text-align: center; }
    .children { display: none; }
    .expanded > .children { display: block; }
    .connector { border-left: 1px solid #2a2a3e; margin-left: 7px; padding-left: 9px; }
  </style>
</head>
<body>
  <h3>🔬 ${topic}</h3>
  <div id="tree"></div>
  <script>
    const tree = ${JSON.stringify(tree)};
    function renderNode(node, depth) {
      const hasChildren = node.children && node.children.length > 0;
      const expanded = node.expanded || false;
      const div = document.createElement('div');
      div.className = 'tree-node depth-' + depth + (expanded ? ' expanded' : '');
      div.innerHTML = '<div class="node-header">' +
        (hasChildren ? '<span class="chevron">' + (expanded ? '▼' : '▶') + '</span>' : '<span class="chevron">•</span>') +
        '<span class="node-label">' + node.label + '</span></div>';
      if (hasChildren) {
        const childContainer = document.createElement('div');
        childContainer.className = 'children connector';
        node.children.forEach(c => childContainer.appendChild(renderNode(c, depth + 1)));
        div.appendChild(childContainer);
        div.querySelector('.node-header').addEventListener('click', () => {
          div.classList.toggle('expanded');
          div.querySelector('.chevron').textContent = div.classList.contains('expanded') ? '▼' : '▶';
          window.parent.postMessage({ jsonrpc: '2.0', method: 'nodeToggle', params: { id: node.id } }, '*');
        });
      }
      return div;
    }
    const container = document.getElementById('tree');
    tree.forEach(n => container.appendChild(renderNode(n, 0)));
  </script>
</body>
</html>`;
}
