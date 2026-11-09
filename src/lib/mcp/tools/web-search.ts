import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "web_search",
  title: "Web search",
  description: "Search DuckDuckGo, Wikipedia and Stack Overflow at once and return merged, numbered sources.",
  inputSchema: { query: z.string().min(2).max(300).describe("What to search for.") },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ query }) => {
    const { metaSearch } = await import("@/lib/server/web-search.server");
    const results = await metaSearch(query).catch(() => []);
    const sources = results.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet, engines: r.engines }));
    return {
      content: [{ type: "text", text: sources.length ? sources.map((r, i) => `[${i + 1}] ${r.title} — ${r.url}\n${r.snippet}`).join("\n\n") : "No results." }],
      structuredContent: { sources },
    };
  },
});
