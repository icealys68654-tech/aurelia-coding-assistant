// Serialized into the opaque-origin preview, with no host dependencies.
function installBridge() {
  let recording: MediaRecorder | undefined;
  let active = false;
  function wav(buffer: AudioBuffer) {
    const channels = buffer.numberOfChannels;
    const bytes = new ArrayBuffer(44 + buffer.length * channels * 2);
    const view = new DataView(bytes);
    const label = (offset: number, value: string) => [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
    label(0, "RIFF"); view.setUint32(4, bytes.byteLength - 8, true); label(8, "WAVE"); label(12, "fmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, channels, true);
    view.setUint32(24, buffer.sampleRate, true); view.setUint32(28, buffer.sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true); view.setUint16(34, 16, true); label(36, "data"); view.setUint32(40, bytes.byteLength - 44, true);
    const data = Array.from({ length: channels }, (_, i) => buffer.getChannelData(i));
    for (let i = 0; i < buffer.length; i++) for (let c = 0; c < channels; c++) {
      const sample = Math.max(-1, Math.min(1, data[c]?.[i] ?? 0));
      view.setInt16(44 + (i * channels + c) * 2, sample * (sample < 0 ? 32768 : 32767), true);
    }
    return new Blob([bytes], { type: "audio/wav" });
  }
  window.addEventListener("message", async (event) => {
    if (event.source !== parent || event.data?.channel !== "aurelia-export") return;
    const { id, action } = event.data;
    if (action === "stop") { if (recording?.state === "recording") recording.stop(); return; }
    if (typeof id !== "string" || active) return;
    active = true;
    const reply = (data: object) => parent.postMessage({ channel: "aurelia-export", id, ...data }, "*");
    try {
      const duration = Math.max(1, Math.min(30, Number(event.data.duration) || 5));
      if (action === "audio") {
        const api = (window as unknown as { aurelia?: { renderAudio?: (duration: number) => Promise<AudioBuffer> } }).aurelia;
        if (!api?.renderAudio) throw new Error("This preview has no audio renderer. Generate audio with the Audio option first.");
        const buffer = await api.renderAudio(duration);
        if (!(buffer instanceof AudioBuffer) || buffer.duration > 31 || buffer.numberOfChannels > 2) throw new Error("Audio must return a mono or stereo AudioBuffer of at most 30 seconds.");
        reply({ blob: wav(buffer), filename: "aurelia-audio.wav" });
      } else {
        const canvas = document.querySelector("canvas");
        if (!canvas) throw new Error("This preview has no canvas. Generate 2D or 3D artwork first.");
        if (action === "image") {
          const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Canvas image could not be captured.")), "image/png"));
          reply({ blob, filename: "aurelia-artwork.png" });
        } else if (action === "video") {
          if (!canvas.captureStream || typeof MediaRecorder === "undefined") throw new Error("Video recording is unavailable in this browser.");
          const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
          if (!mime) throw new Error("No supported video recording format in this browser.");
          const stream = canvas.captureStream(30);
          const chunks: Blob[] = [];
          try {
            const recorder = new MediaRecorder(stream, { mimeType: mime });
            recording = recorder;
            const result = await new Promise<Blob>((resolve, reject) => {
              let timer: ReturnType<typeof setTimeout>;
              recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
              recorder.onerror = () => { clearTimeout(timer); reject(new Error("Video recording failed.")); };
              recorder.onstop = () => { clearTimeout(timer); resolve(new Blob(chunks, { type: mime })); };
              recorder.start();
              timer = setTimeout(() => { if (recorder.state === "recording") recorder.stop(); }, duration * 1000);
            });
            reply({ blob: result, filename: mime.startsWith("video/mp4") ? "aurelia-video.mp4" : "aurelia-video.webm" });
          } finally { stream.getTracks().forEach((track) => track.stop()); recording = undefined; }
        } else throw new Error("Unknown export format.");
      }
    } catch (error) { reply({ error: error instanceof Error ? error.message : "Export failed." }); }
    finally { active = false; }
  });
}
export const previewBridge = `(${installBridge.toString()})();`;