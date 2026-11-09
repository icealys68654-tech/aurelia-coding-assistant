import { describe, expect, it } from "vitest";
import { checkHtml } from "@/lib/server/agent.server";

describe("checkHtml", () => {
  it("passes a complete self-contained page", () => {
    const r = checkHtml("<html><body><canvas></canvas><script>const c=document.querySelector('canvas').getContext('2d');</script></body></html>");
    expect(r.ok).toBe(true);
  });
  it("flags network resources the preview blocks", () => {
    const r = checkHtml('<html><script src="https://cdn.x/a.js"></script></html>');
    expect(r.ok).toBe(false);
  });
  it("ignores brackets inside strings and comments", () => {
    const r = checkHtml("<html><script>const s = '(('; // }}\nconsole.log(`[${s}`);</script></html>");
    expect(r.ok).toBe(true);
  });
  it("allows plain outbound links", () => {
    const r = checkHtml('<html><body><a href="https://react.dev">React</a></body></html>');
    expect(r.ok).toBe(true);
  });
  it("still flags real unbalanced code", () => {
    expect(checkHtml("<html><script>function f() {</script></html>").ok).toBe(false);
  });
});
