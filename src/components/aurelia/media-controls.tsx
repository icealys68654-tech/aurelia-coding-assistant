import { useEffect, useRef, useState, type RefObject } from "react";
import { Download, Image, Music, Video, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deliverFile } from "@/lib/media";
import { toast } from "sonner";

export function MediaControls({ frame, revision, ready }: { frame: RefObject<HTMLIFrameElement | null>; revision: string | null; ready: boolean }) {
  const [duration, setDuration] = useState(5);
  const [working, setWorking] = useState<string | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(null);
  const pending = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  useEffect(() => {
    setResult(null); setWorking(null);
    const receive = (event: MessageEvent) => {
      const request = pending.current;
      if (!request || event.source !== frame.current?.contentWindow || event.data?.channel !== "aurelia-export" || event.data.id !== request.id) return;
      clearTimeout(request.timer); pending.current = null; setWorking(null);
      if (typeof event.data.error === "string") { toast.error(event.data.error); return; }
      const blob = event.data.blob;
      const formats: Record<string, string> = { "image/png": "aurelia-artwork.png", "audio/wav": "aurelia-audio.wav", "video/webm": "aurelia-video.webm", "video/mp4": "aurelia-video.mp4" };
      if (!(blob instanceof Blob) || !blob.size || blob.size > 100 * 1024 * 1024) { toast.error("Export is empty or exceeds 100 MB."); return; }
      const filename = formats[blob.type.split(";")[0] ?? ""];
      if (!filename) { toast.error("Unsupported export format."); return; }
      setResult({ blob, filename });
    };
    window.addEventListener("message", receive);
    return () => { window.removeEventListener("message", receive); if (pending.current) clearTimeout(pending.current.timer); pending.current = null; };
  }, [frame, revision]);
  function prepare(action: string) {
    if (!frame.current?.contentWindow || pending.current) return;
    setResult(null); setWorking(action);
    const id = crypto.randomUUID();
    pending.current = { id, timer: setTimeout(() => { pending.current = null; setWorking(null); toast.error("Export timed out. Rerun the preview and try again."); }, (duration + 15) * 1000) };
    frame.current.contentWindow.postMessage({ channel: "aurelia-export", id, action, duration }, "*");
  }
  return (
    <div className="flex flex-col gap-3 border-t border-border px-3 py-3" role="group" aria-label="Artwork, audio and video exports">
      <span className="text-xs font-medium text-foreground">Export files</span>
      <div className="grid grid-cols-3 gap-2">
        {([{ action: "image", label: "Prepare PNG", text: "Artwork", format: "PNG", icon: Image }, { action: "audio", label: "Prepare WAV", text: "Audio", format: "WAV", icon: Music }, { action: "video", label: "Record video", text: "Video", format: "Record", icon: Video }]).map(({ action, label, text, format, icon: Icon }) => (
          <Button key={action} variant="outline" className="h-16 min-w-0 flex-col gap-1 px-1" title={label} aria-label={label} disabled={!ready || Boolean(working)} onClick={() => prepare(action)}>
            <span className="flex items-center gap-1 text-xs"><Icon className="size-3.5" />{text}</span>
            <span className="text-[10px] text-muted-foreground">{working === action ? (action === "video" ? "Recording…" : "Preparing…") : format}</span>
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Duration
        <input aria-label="Export duration in seconds" className="w-12 rounded border border-border bg-background px-1 py-1 text-foreground" type="number" min={1} max={30} value={duration} disabled={Boolean(working)} onChange={(e) => setDuration(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />s
      </label>
      {working && <span role="status" className="text-xs text-muted-foreground">{working === "video" ? "Recording…" : "Preparing…"}</span>}
      {working === "video" && <Button size="icon-sm" variant="ghost" title="Stop recording" aria-label="Stop recording" onClick={() => frame.current?.contentWindow?.postMessage({ channel: "aurelia-export", action: "stop" }, "*")}><Square /></Button>}
      </div>
      {result && <Button className="w-full" aria-label={`Download ${result.filename.endsWith("png") ? "PNG" : result.filename.endsWith("wav") ? "WAV" : "video"}`} onClick={() => void deliverFile(result.blob, result.filename)}><Download />Download {result.filename.endsWith("png") ? "artwork · PNG" : result.filename.endsWith("wav") ? "audio · WAV" : "video"}</Button>}
    </div>
  );
}