import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

type Part = { type?: string; text?: string };
type Msg = { role?: string; parts?: Part[] };

export default defineTool({
  name: "get_project",
  title: "Get project",
  description: "Read one AURELIA project's conversation as plain text, including generated code.",
  inputSchema: { id: z.string().uuid().describe("Project ID from list_projects.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("conversations")
      .select("id,title,messages")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) throw new ToolError("Project not found.");
    const messages = ((data.messages as unknown as Msg[]) ?? []).map((m) => ({
      role: m.role ?? "unknown",
      text: (m.parts ?? []).filter((p) => p.type === "text").map((p) => p.text ?? "").join("\n"),
    }));
    const text = `# ${data.title}\n\n` + messages.map((m) => `## ${m.role}\n${m.text}`).join("\n\n");
    return { content: [{ type: "text", text: text.slice(0, 60000) }], structuredContent: { id: data.id, title: data.title, messages } };
  },
});
