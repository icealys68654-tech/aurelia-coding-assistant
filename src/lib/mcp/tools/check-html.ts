import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { checkHtml } from "@/lib/server/agent.server";

export default defineTool({
  name: "check_html",
  title: "Check HTML",
  description: "Run AURELIA's agent check on a self-contained HTML page and list structural problems.",
  inputSchema: { html: z.string().min(1).max(200000).describe("Complete HTML document.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ html }) => {
    const r = checkHtml(html);
    return {
      content: [{ type: "text", text: r.ok ? "No problems found." : r.problems.join("\n") }],
      structuredContent: { ok: r.ok, problems: r.problems },
    };
  },
});
