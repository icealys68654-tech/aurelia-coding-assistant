import type { FileUIPart } from "ai";

export const UPLOAD_ACCEPT =
  "image/*,audio/*,video/*,application/pdf,text/*,.txt,.md,.html,.htm,.css,.js,.jsx,.ts,.tsx,.json,.py,.java,.c,.cpp,.h,.cs,.go,.rs,.rb,.php,.sh,.sql,.xml,.yml,.yaml,.svg,.csv";

/** Max size for files sent directly to the AI (images, PDFs). */
export const MAX_ATTACH_BYTES = 4 * 1024 * 1024;
export const MAX_TEXT_BYTES = 200_000;

export type UploadResult =
  | { kind: "text"; text: string }
  | { kind: "file"; part: FileUIPart };

function dataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("The file could not be read."));
    r.readAsDataURL(file);
  });
}

function mediaInfo(file: File) {
  return new Promise<string>((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(file.type.startsWith("video") ? "video" : "audio");
    const done = (info: string) => {
      URL.revokeObjectURL(url);
      resolve(info);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const parts = [`duration ${el.duration.toFixed(1)}s`];
      if (el instanceof HTMLVideoElement && el.videoWidth) parts.push(`${el.videoWidth}×${el.videoHeight}`);
      done(parts.join(", "));
    };
    el.onerror = () => done("metadata unavailable");
    el.src = url;
  });
}

const kb = (n: number) => `${Math.round(n / 1024)} KB`;

export async function readUpload(file: File): Promise<UploadResult> {
  const type = file.type || "application/octet-stream";
  if (type.startsWith("image/") || type === "application/pdf") {
    if (file.size > MAX_ATTACH_BYTES) throw new Error("Images and PDFs must be under 4 MB.");
    return { kind: "file", part: { type: "file", mediaType: type, filename: file.name, url: await dataUrl(file) } };
  }
  if (type.startsWith("audio/") || type.startsWith("video/")) {
    const info = await mediaInfo(file);
    return {
      kind: "text",
      text: `Attached ${type.split("/")[0]} file: ${file.name} (${type}, ${kb(file.size)}, ${info}). The assistant cannot hear or watch it; use these details.`,
    };
  }
  if (file.size > MAX_TEXT_BYTES) throw new Error("Text and code files must be under 200 KB.");
  const content = await file.text();
  if (content.includes("\u0000")) throw new Error("This file type isn't supported.");
  const ext = file.name.split(".").pop() ?? "";
  return { kind: "text", text: `File: ${file.name}\n\`\`\`${ext}\n${content}\n\`\`\`` };
}
