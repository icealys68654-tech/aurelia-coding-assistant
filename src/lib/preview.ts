export type CodeFile = { language: string; code: string };
export function extractCode(text: string): CodeFile[] {
  const fenced = Array.from(text.matchAll(/```([\w+-]*)[^\n]*\n([\s\S]*?)```/g), (m) => ({
    language: (m[1] || "text").toLowerCase(),
    code: (m[2] || "").trim(),
  }));
  if (fenced.length) return fenced;
  const document = text.match(/(?:<!doctype html>\s*)?<html\b[^>]*>[\s\S]*<\/html>/i)?.[0];
  return document ? [{ language: "html", code: document }] : [];
}
export function buildPreview(files: CodeFile[]): string | null {
  const html = files.filter((f) => ["html", "htm"].includes(f.language)).at(-1)?.code;
  if (!html) return null;
  const css = files
    .filter((f) => f.language === "css")
    .map((f) => f.code.replace(/<\/style/gi, "<\\/style"))
    .join("\n");
  const js = files
    .filter((f) => ["js", "javascript"].includes(f.language))
    .map((f) => f.code.replace(/<\/script/gi, "<\\/script"))
    .join("\n");
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none';">`;
  return `<!doctype html><html><head>${policy}<style>${css}</style></head><body>${html}<script>${js}</script></body></html>`;
}
