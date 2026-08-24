import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { researchTreeTool } from "./tools/researchTool.js";
import { taskListTool } from "./tools/taskListTool.js";
import { bookingTool } from "./tools/bookingTool.js";

const server = new McpServer({
  name: "skybridge-mcp",
  version: "0.1.0",
});

// Register tools
server.tool(
  "research_tree",
  "Generate an interactive research tree/mind map for a given topic",
  {
    topic: z.string().describe("The research topic to explore"),
    depth: z.number().min(1).max(5).default(3).describe("Depth of the research tree"),
  },
  async ({ topic, depth }) => {
    const result = researchTreeTool(topic, depth);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.data, null, 2),
        },
        {
          type: "resource" as const,
          resource: {
            uri: "data:text/html;base64," + Buffer.from(result.viewHtml).toString("base64"),
            mimeType: "text/html",
            text: result.viewHtml,
          },
        },
      ],
    };
  }
);

server.tool(
  "interactive_checklist",
  "Create an interactive task checklist with live status tracking",
  {
    title: z.string().describe("Title of the checklist"),
    items: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          done: z.boolean().default(false),
        })
      )
      .describe("List of checklist items"),
  },
  async ({ title, items }) => {
    const result = taskListTool(title, items);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.data, null, 2),
        },
        {
          type: "resource" as const,
          resource: {
            uri: "data:text/html;base64," + Buffer.from(result.viewHtml).toString("base64"),
            mimeType: "text/html",
            text: result.viewHtml,
          },
        },
      ],
    };
  }
);

server.tool(
  "time_slot_picker",
  "Visual time slot picker for scheduling and booking",
  {
    date: z.string().describe("Date in YYYY-MM-DD format"),
    slots: z
      .array(
        z.object({
          time: z.string().describe("Time slot (e.g., '09:00')"),
          available: z.boolean(),
        })
      )
      .describe("Available time slots"),
  },
  async ({ date, slots }) => {
    const result = bookingTool(date, slots);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result.data, null, 2),
        },
        {
          type: "resource" as const,
          resource: {
            uri: "data:text/html;base64," + Buffer.from(result.viewHtml).toString("base64"),
            mimeType: "text/html",
            text: result.viewHtml,
          },
        },
      ],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[Skybridge MCP] Server started on stdio");
}

main().catch((err) => {
  console.error("[Skybridge MCP] Fatal error:", err);
  process.exit(1);
});
