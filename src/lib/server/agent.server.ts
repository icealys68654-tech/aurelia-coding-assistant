import { tool } from "ai";
import { z } from "zod";
import { searchWeb } from "./web-search.server";

export const agentInstructions =
  "AGENT MODE: Work in visible steps. First call plan with 2-5 short steps. Use web_search when facts may be current or uncertain, and cite sources as [n](url). After writing any HTML document, call check_html with the full document; if it reports problems, fix them and check again (at most 2 retries). Finish with the final answer and code.";

/** Remove comments and string/template literals so brackets inside them are not counted. */
export function stripCode(code: string) {
  return code.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/g, '""');
}

export function checkHtml(html: string) {
  const problems: string[] = [];
  const count = (re: RegExp) => (html.match(re) ?? []).length;
  if (!/<html[\s>]/i.test(html) || !/<\/html>/i.test(html)) problems.push("Missing <html> or </html>.");
  if (count(/<script\b/gi) !== count(/<\/script>/gi)) problems.push("Unbalanced <script> tags.");
  if (count(/<style\b/gi) !== count(/<\/style>/gi)) problems.push("Unbalanced <style> tags.");
  // Plain <a href="https://..."> links are fine; only loaded resources are blocked.
  if (
    /\bsrc\s*=\s*["']https?:\/\//i.test(html) ||
    /<link\b[^>]*href\s*=\s*["']https?:\/\//i.test(html) ||
    /\burl\(\s*["']?https?:\/\//i.test(html) ||
    /\bfetch\s*\(|XMLHttpRequest|\bimport\s*\(/.test(stripCode(html))
  )
    problems.push("Uses network resources, which the sandboxed preview blocks.");
  if (/<canvas\b/i.test(html) && !/getContext\s*\(/.test(html)) problems.push("Has a <canvas> but never calls getContext().");
  for (const block of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const code = stripCode(block[1]!);
    const pairs: [string, string][] = [["(", ")"], ["{", "}"], ["[", "]"]];
    for (const [o, c] of pairs)
      if (code.split(o).length !== code.split(c).length) problems.push(`Script has unbalanced ${o}${c}.`);
  }
  return { ok: problems.length === 0, problems: [...new Set(problems)] };
}

export function agentTools() {
  return {
    plan: tool({
      description: "Record the short plan you will follow. Call once at the start.",
      inputSchema: z.object({ steps: z.array(z.string().max(160)).min(1).max(6) }),
      execute: async ({ steps }) => ({ steps }),
    }),
    web_search: tool({
      description: "Search DuckDuckGo, Stack Overflow, MDN and Wikipedia; returns numbered sources with excerpts and provider status.",
      inputSchema: z.object({ query: z.string().min(2).max(300) }),
      execute: async ({ query }) => {
        const { results, providers } = await searchWeb(query);
        return {
          providers,
          sources: results.map((r, i) => ({
            n: i + 1,
            title: r.title,
            url: r.url,
            snippet: r.snippet,
            excerpt: r.content.slice(0, 1500),
          })),
        };
      },
    }),
    check_html: tool({
      description: "Check a complete HTML document for structural problems before presenting it.",
      inputSchema: z.object({ html: z.string().max(200000) }),
      execute: async ({ html }) => checkHtml(html),
    }),
  };
}
