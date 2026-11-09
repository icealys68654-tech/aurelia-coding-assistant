import { describe, expect, it } from "vitest";
import { mergeHits } from "@/lib/server/web-search.server";

describe("mergeHits", () => {
  it("merges the same page found by two engines", () => {
    const out = mergeHits([
      [{ title: "A", url: "https://www.x.com/a/", snippet: "", engines: ["Bing"] }],
      [{ title: "A", url: "https://x.com/a", snippet: "s", engines: ["DuckDuckGo"] }],
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.engines).toEqual(["Bing", "DuckDuckGo"]);
  });
});

