import { afterEach, describe, expect, it, vi } from "vitest";
import { compactQuery, mergeHits, parseDuckDuckGo, searchContext, searchWeb } from "@/lib/server/web-search.server";

afterEach(() => vi.unstubAllGlobals());

describe("mergeHits", () => {
  it("merges the same page found by two engines", () => {
    const out = mergeHits([
      [{ title: "A", url: "https://www.x.com/a/", snippet: "", engines: ["Bing"] }],
      [{ title: "A", url: "https://x.com/a", snippet: "s", engines: ["DuckDuckGo"] }],
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]?.engines).toEqual(["Bing", "DuckDuckGo"]);
  });
});

describe("shared web search", () => {
  it("parses reordered attributes, lite results and missing snippets without losing links", () => {
    const hits = parseDuckDuckGo(`<a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Freact.dev%2Fversions" class='result__a'>React &#x26; versions</a>
      <a href="https://stackoverflow.com/questions/123" class='result-link'>Canvas</a><td class='result-snippet'>Animation &amp; timing</td>
      <a class="result__a" href="//duckduckgo.com/l/?uddg=%invalid">Bad</a>`);
    expect(hits.map(h => h.url)).toEqual(["https://react.dev/versions", "https://stackoverflow.com/questions/123"]);
    expect(hits[0]?.snippet).toBe("");
    expect(hits[1]?.snippet).toBe("Animation & timing");
  });

  it("removes chat phrasing while retaining coding terms", () => {
    expect(compactQuery("Please explain how to use requestAnimationFrame with canvas and cite numbered sources")).toBe("use requestAnimationFrame canvas");
  });

  it("returns DuckDuckGo, Stack Overflow and other sites even when the primary endpoint fails", async () => {
    const fetcher = vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.hostname === "html.duckduckgo.com") return new Response("blocked", { status: 503 });
      if (url.hostname === "lite.duckduckgo.com") return new Response(`<a href='https://example.org/canvas' class='result-link'>Canvas animation</a><td class='result-snippet'>Timing</td>`);
      if (url.hostname === "duckduckgo.com") return new Response("<html></html>");
      if (url.hostname === "api.stackexchange.com") return Response.json({ items: [{ title: "Canvas timing", link: "https://stackoverflow.com/questions/123", tags: ["canvas"], body: "<p>Use requestAnimationFrame</p>" }] });
      if (url.pathname === "/api/v1/search") return Response.json({ documents: [{ title: "Animation", mdn_url: "/en-US/docs/Web/API/Window/requestAnimationFrame", summary: "Animation timing" }] });
      if (url.hostname === "en.wikipedia.org" && url.pathname === "/w/api.php") return Response.json({ query: { search: [{ title: "Canvas element", snippet: "HTML" }] } });
      return new Response("<p>Page text</p>");
    });
    vi.stubGlobal("fetch", fetcher);
    const { results, providers } = await searchWeb("How to animate canvas?");
    expect(results.flatMap(h => h.engines)).toEqual(expect.arrayContaining(["DuckDuckGo", "Stack Overflow", "MDN", "Wikipedia"]));
    expect(providers.every(p => p.status === "ok")).toBe(true);
    expect(results.some(h => h.url === "https://example.org/canvas")).toBe(true);
    expect(searchContext(results, providers)).toContain("[1]");
  });

  it("retries empty Stack Overflow results with a focused title search", async () => {
    const fetcher = vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.hostname === "api.stackexchange.com") return Response.json({ items: url.pathname.endsWith("/advanced") ? [] : [{ title: "requestAnimationFrame", link: "https://stackoverflow.com/questions/456", tags: [] }] });
      if (url.hostname === "en.wikipedia.org") return Response.json({ query: { search: [] } });
      if (url.pathname === "/api/v1/search") return Response.json({ documents: [] });
      return new Response("<html></html>");
    });
    vi.stubGlobal("fetch", fetcher);
    const { results } = await searchWeb("Explain requestAnimationFrame with canvas");
    expect(results[0]?.engines).toEqual(["Stack Overflow"]);
    expect(fetcher.mock.calls.some(([input]) => new URL(input).searchParams.get("intitle") === "requestAnimationFrame")).toBe(true);
  });

  it("reports blocked providers instead of pretending Wikipedia is the whole search", async () => {
    vi.stubGlobal("fetch", async (input: string) => {
      if (input.includes("en.wikipedia.org/w/api.php")) return Response.json({ query: { search: [{ title: "React", snippet: "Library" }] } });
      return new Response("unavailable", { status: 429 });
    });
    const { results, providers } = await searchWeb("React version");
    expect(providers.find(p => p.name === "DuckDuckGo")?.status).toBe("unavailable");
    expect(providers.find(p => p.name === "Stack Overflow")?.status).toBe("unavailable");
    expect(searchContext(results, providers)).toContain("Partial search: DuckDuckGo: unavailable");
  });
});

