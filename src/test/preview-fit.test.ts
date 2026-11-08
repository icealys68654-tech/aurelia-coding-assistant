import { describe, expect, it } from "vitest";
import { GOLDEN_RATIO, canvasInset, fittedContent, releaseMediaClipping } from "@/lib/preview-fit";

describe("Golden rectangle canvas fitting", () => {
  it.each([[400, 1600], [1600, 400], [900, 900], [2400, 100]])("contains %i × %i artwork without changing its shape", (w, h) => {
    const width = 390, height = width / GOLDEN_RATIO;
    const inset = canvasInset(width, height);
    const fit = fittedContent(width, height, w, h, inset);
    expect(fit.x).toBeGreaterThanOrEqual(inset - 0.000001);
    expect(fit.y).toBeGreaterThanOrEqual(inset - 0.000001);
    expect(fit.x + w * fit.scale).toBeLessThanOrEqual(width - inset + 0.000001);
    expect(fit.y + h * fit.scale).toBeLessThanOrEqual(height - inset + 0.000001);
    expect(w * fit.scale / (h * fit.scale)).toBeCloseTo(w / h);
  });
  it("adapts padding to small canvases", () => {
    expect(canvasInset(390, 240)).toBe(6);
    expect(canvasInset(800, 500)).toBe(12);
  });
  it("releases a container that clips the bottom of artwork", () => {
    const body = document.createElement("div");
    const container = document.createElement("div");
    const canvas = document.createElement("canvas");
    container.style.overflow = "hidden";
    const rect = (height: number): DOMRect => ({ x: 0, y: 0, width: 600, height, top: 0, left: 0, right: 600, bottom: height, toJSON: () => ({}) });
    container.getBoundingClientRect = () => rect(300);
    canvas.getBoundingClientRect = () => rect(500);
    container.append(canvas); body.append(container); document.body.append(body);
    releaseMediaClipping(body);
    expect(container.style.overflow).toBe("visible");
    body.remove();
  });
  it("shows the complete image instead of object-fit cropping", () => {
    const body = document.createElement("div");
    const image = document.createElement("img");
    image.style.objectFit = "cover"; body.append(image); document.body.append(body);
    releaseMediaClipping(body);
    expect(image.style.objectFit).toBe("contain");
    body.remove();
  });
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