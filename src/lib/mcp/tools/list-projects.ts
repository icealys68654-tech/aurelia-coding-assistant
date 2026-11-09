import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_projects",
  title: "List projects",
  description: "List the signed-in user's AURELIA coding projects, newest first.",
  inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("Maximum projects to return (default 20).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("conversations")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) throw new ToolError("Projects could not be loaded.");
    const projects = data.map((p) => ({ id: p.id, title: p.title, updated_at: p.updated_at }));
    return {
      content: [{ type: "text", text: projects.length ? projects.map((p) => `${p.id}: ${p.title}`).join("\n") : "No projects yet." }],
      structuredContent: { projects },
    };
  },
});
