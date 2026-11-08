import { describe, expect, it } from "vitest";
import { GOLDEN_RATIO, fittedContent } from "@/lib/preview-fit";

describe("Golden rectangle canvas fitting", () => {
  it("uses the golden width-to-height ratio", () => {
    expect(GOLDEN_RATIO).toBeCloseTo(1.61803398875, 10);
  });
  it("fits oversized content completely inside the golden canvas", () => {
    const width = 800;
    const height = width / GOLDEN_RATIO;
    const fit = fittedContent(width, height, 1200, 1000);
    expect(fit.scale).toBeCloseTo(height / 1000);
    expect(fit.x).toBeGreaterThanOrEqual(0);
    expect(fit.y).toBeGreaterThanOrEqual(0);
    expect(1200 * fit.scale + fit.x).toBeLessThanOrEqual(width);
    expect(1000 * fit.scale + fit.y).toBeLessThanOrEqual(height);
  });
});