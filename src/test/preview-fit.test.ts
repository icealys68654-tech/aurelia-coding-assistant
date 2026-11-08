import { describe, expect, it } from "vitest";
import { GOLDEN_RATIO, fittedContent } from "@/lib/preview-fit";

describe("Golden rectangle canvas fitting", () => {
  it("leaves equal top and bottom clearance for the complete content box", () => {
    const fit = fittedContent(800, 800 / GOLDEN_RATIO, 1200, 1000, 12);
    expect(fit.y).toBeCloseTo(12);
    expect(800 / GOLDEN_RATIO - (fit.y + 1000 * fit.scale)).toBeCloseTo(12);
    expect(fit.x).toBeCloseTo((800 - 1200 * fit.scale) / 2);
  });
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