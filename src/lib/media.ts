export type CreationTarget = "code" | "2d" | "3d" | "audio" | "video";
export type CreationSelection = { mode: "explain" | "preview"; target: CreationTarget };
export function readCreationSelection(value: unknown): CreationSelection {
  const selection = value as Partial<CreationSelection> | null;
  return {
    mode: selection?.mode === "preview" ? "preview" : "explain",
    target: ["code", "2d", "3d", "audio", "video"].includes(selection?.target ?? "") ? selection?.target as CreationTarget : "code",
  };
}
export const mediaInstructions = `For canvas artwork, audio, or video requests in EITHER mode, return one complete self-contained html fenced document with inline CSS and JavaScript, then explain it. No imports, network resources or external dependencies. Draw 2D artwork with Canvas2D, and 3D artwork using native WebGL or projected 3D geometry on a canvas. Use preserveDrawingBuffer:true with WebGL. Animate the canvas for video capture. For audio implement window.aurelia = { renderAudio: async (duration) => AudioBuffer } using OfflineAudioContext to synthesize the requested sound, honoring duration in seconds. No microphone or camera. Include audio playback controls. The workspace exports the first canvas as PNG or silent browser-supported video and renderAudio output as WAV. Do not claim files exist before export.`;
export function creationRequest(text: string, target: CreationTarget): string {
  if (target === "code") return text;
  const labels = { "2d": "2D canvas artwork", "3d": "3D canvas artwork", audio: "synthesized audio", video: "animated canvas video" };
  return `${text}\n\nOutput: ${labels[target]}. Provide complete self-contained HTML for live preview, plus an explanation. ${target === "audio" ? "Expose window.aurelia.renderAudio(duration) returning an AudioBuffer using OfflineAudioContext for WAV export." : "Draw on a canvas for PNG and video export."}`;
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
export async function deliverFile(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; }
    catch (error) { if ((error as DOMException).name === "AbortError") return; }
  }
  downloadBlob(blob, filename);
}