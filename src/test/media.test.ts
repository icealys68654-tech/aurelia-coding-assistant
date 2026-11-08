import { describe, expect, it } from "vitest";
import { creationRequest, readCreationSelection } from "@/lib/media";
import { buildPreview } from "@/lib/preview";
describe("Canvas and media generation", () => {
  it.each(["explain", "preview"] as const)("retains all four output selections in %s mode", (mode) => {
    for (const target of ["2d", "3d", "audio", "video"] as const) expect(readCreationSelection({ mode, target })).toEqual({ mode, target });
  });
  it("defaults invalid saved selections safely", () => { expect(readCreationSelection({ mode: "invalid", target: "invalid" })).toEqual({ mode: "explain", target: "code" }); });
  it("preserves ordinary generate-and-explain requests", () => { expect(creationRequest("Explain Python", "code")).toBe("Explain Python"); });
  it("requests canvas output for 2D artwork", () => { expect(creationRequest("Draw a flower", "2d")).toContain("2D canvas artwork"); });
  it("requests canvas output for 3D artwork", () => { expect(creationRequest("Draw a cube", "3d")).toContain("3D canvas artwork"); });
  it("requests an offline audio renderer for WAV", () => { expect(creationRequest("Make a chord", "audio")).toContain("window.aurelia.renderAudio(duration)"); });
  it("requests animated canvas video", () => { expect(creationRequest("Animate waves", "video")).toContain("animated canvas video"); });
  it("keeps export-enabled previews network isolated", () => { expect(buildPreview([{ language: "html", code: "<canvas></canvas>" }], true)).toContain("connect-src 'none'"); });
  it("does not add host messaging to downloaded HTML", () => { expect(buildPreview([{ language: "html", code: "<canvas></canvas>" }])).not.toContain("aurelia-export"); });
});