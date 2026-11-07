import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AURELIA — Rainbow Sphere" },
      { name: "description", content: "An interactive rotating rainbow sphere rendered pixel by pixel." },
      { property: "og:title", content: "AURELIA — Rainbow Sphere" },
      { property: "og:description", content: "An interactive rotating rainbow sphere rendered pixel by pixel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [spin, setSpin] = useState(12);
  const [xor, setXor] = useState(false);
  const opts = useRef({ spin, xor });
  opts.current = { spin, xor };

  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const N = cv.width;
    const img = ctx.createImageData(N, N);
    const d = img.data;
    const PI = Math.PI;
    const table: [number, number, number][] = [];
    for (let i = 0; i < 360; i++) {
      const h = i / 60, k = Math.floor(h) % 6, f = h - Math.floor(h), q = 1 - f;
      const c = [[1, f, 0], [q, 1, 0], [0, 1, f], [0, q, 1], [f, 0, 1], [1, 0, q]][k]!;
      table.push([Math.round(c[0]! * 255), Math.round(c[1]! * 255), Math.round(c[2]! * 255)]);
    }
    let yaw = 0, pitch = 0.4, drag = false, lx = 0, ly = 0, raf = 0;
    const down = (e: PointerEvent) => { drag = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; };
    const up = () => { drag = false; cv.style.cursor = "grab"; };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      yaw += (e.clientX - lx) * 0.01;
      pitch = Math.max(-1.4, Math.min(1.4, pitch + (e.clientY - ly) * 0.01));
      lx = e.clientX; ly = e.clientY;
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointermove", move);
    const L: [number, number, number] = [-0.45, 0.55, 0.7];
    const ll = Math.hypot(...L);
    L[0] /= ll; L[1] /= ll; L[2] /= ll;

    const draw = () => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), inv = opts.current.xor;
      for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
        const x = ((px + 0.5) / N) * 2.12 - 1.06, y = -(((py + 0.5) / N) * 2.12 - 1.06), r2 = x * x + y * y, o = (py * N + px) * 4;
        if (r2 > 1) { d[o + 3] = 0; continue; }
        const z = Math.sqrt(1 - r2), y1 = y * cp + z * sp, z1 = -y * sp + z * cp, x2 = x * cy - z1 * sy, z2 = x * sy + z1 * cy;
        const lon = Math.atan2(x2, z2), lat = Math.asin(y1);
        let idx = Math.floor(((lon + PI) / (2 * PI)) * 360 + (lat / PI) * 120) % 360;
        if (idx < 0) idx += 360;
        const col = table[idx]!, dif = Math.max(0, x * L[0] + y * L[1] + z * L[2]), sh = 0.38 + 0.62 * dif, spec = Math.pow(dif, 40) * 0.7;
        let rr = col[0] * sh, gg = col[1] * sh, bb = col[2] * sh;
        rr += (255 - rr) * spec; gg += (255 - gg) * spec; bb += (255 - bb) * spec;
        rr = Math.round(rr); gg = Math.round(gg); bb = Math.round(bb);
        if (inv) { rr ^= 255; gg ^= 255; bb ^= 255; }
        d[o] = rr; d[o + 1] = gg; d[o + 2] = bb;
        const e = Math.sqrt(r2);
        d[o + 3] = e > 0.99 ? Math.round(((1 - e) / 0.01) * 255) : 255;
      }
      ctx.putImageData(img, 0, 0);
    };
    const loop = () => { if (!drag) yaw += opts.current.spin * 0.0005; draw(); raf = requestAnimationFrame(loop); };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center bg-background px-4 py-6 text-foreground">
      <h1 className="mb-1 text-[22px] font-medium">AURELIA</h1>
      <p className="mb-4 text-sm text-muted-foreground">Unit sphere, rainbow table lookup, pixel by pixel.</p>
      <canvas
        ref={ref}
        width={400}
        height={400}
        aria-label="Rotating rainbow sphere"
        className="h-[min(92vw,460px)] w-[min(92vw,460px)] cursor-grab touch-none"
      />
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          Spin
          <input type="range" min={0} max={40} step={1} value={spin} onChange={(e) => setSpin(+e.target.value)} className="w-40" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={xor} onChange={(e) => setXor(e.target.checked)} />
          XOR with #FFFFFF
        </label>
      </div>
      <div className="mt-3 text-[13px] text-muted-foreground">Drag the sphere to rotate it.</div>
    </main>
  );
}
