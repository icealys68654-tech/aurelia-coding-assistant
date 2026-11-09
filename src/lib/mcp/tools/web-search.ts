import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "web_search",
  title: "Web search",
  description: "Search DuckDuckGo, Stack Overflow, MDN and Wikipedia and return merged, numbered sources with provider status.",
  inputSchema: { query: z.string().min(2).max(300).describe("What to search for.") },
  annotations: { readOnlyHint: true, openWorldHint: true },
  handler: async ({ query }) => {
    const { searchWeb, searchContext } = await import("@/lib/server/web-search.server");
    const { results, providers } = await searchWeb(query);
    const sources = results.map((r) => ({ title: r.title, url: r.url, snippet: r.snippet, engines: r.engines }));
    return {
      content: [{ type: "text", text: searchContext(results, providers) }],
      structuredContent: { sources, providers: providers.map(p => ({ ...p })) },
    };
  },
});
