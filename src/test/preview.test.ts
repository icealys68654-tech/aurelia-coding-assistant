import { describe, expect, it } from "vitest";
import { buildPreview, extractCode } from "@/lib/preview";
describe("Browser code execution", () => {
  it('accepts a complete raw HTML document', () => {
    expect(extractCode('<!doctype html><html><body><button>Add</button></body></html>')[0]?.language).toBe('html');
  });
  it("extracts completed HTML, CSS and JavaScript fences", () => {
    expect(
      extractCode(
        "```html\n<button>Run</button>\n```\n```css\nbutton {color:red}\n```\n```js\nlet x=1;\n```",
      ).map((f) => f.language),
    ).toEqual(["html", "css", "js"]);
  });
  it("never executes an incomplete streamed fence", () => {
    expect(buildPreview(extractCode("```html\n<button>Incomplete"))).toBeNull();
  });
  it("only previews browser HTML, not Python code", () => {
    expect(buildPreview([{ language: "python", code: "print(1)" }])).toBeNull();
  });
  it("blocks network connections and includes separate scripts", () => {
    const doc = buildPreview([
      { language: "html", code: "<h1>Hello</h1>" },
      { language: "js", code: "let x=1;" },
    ]);
    expect(doc).toContain("connect-src 'none'");
    expect(doc).toContain("<script>let x=1;</script>");
  });
});
