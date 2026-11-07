import { useEffect, useRef } from "react";
export function Sphere({ xor = false, spin = 10 }: { xor?: boolean; spin?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ spin, xor });
  opts.current = { spin, xor };
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const N = cv.width;
    const img = ctx.createImageData(N, N);
    const d = img.data;
    const PI = Math.PI;
    const table: [number, number, number][] = [];
    for (let i = 0; i < 360; i++) {
      const h = i / 60,
        k = Math.floor(h) % 6,
        f = h - Math.floor(h),
        q = 1 - f;
      const c = [
        [1, f, 0],
        [q, 1, 0],
        [0, 1, f],
        [0, q, 1],
        [f, 0, 1],
        [1, 0, q],
      ][k];
      if (!c) continue;
      table.push([
        Math.round((c[0] ?? 0) * 255),
        Math.round((c[1] ?? 0) * 255),
        Math.round((c[2] ?? 0) * 255),
      ]);
    }
    let yaw = 0,
      pitch = 0.4,
      drag = false,
      lx = 0,
      ly = 0,
      raf = 0;
    const down = (e: PointerEvent) => {
      drag = true;
      lx = e.clientX;
      ly = e.clientY;
      cv.setPointerCapture(e.pointerId);
      cv.style.cursor = "grabbing";
    };
    const up = () => {
      drag = false;
      cv.style.cursor = "grab";
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      yaw += (e.clientX - lx) * 0.01;
      pitch = Math.max(-1.4, Math.min(1.4, pitch + (e.clientY - ly) * 0.01));
      lx = e.clientX;
      ly = e.clientY;
    };
    cv.addEventListener("pointerdown", down);
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointermove", move);
    const draw = () => {
      const cy = Math.cos(yaw),
        sy = Math.sin(yaw),
        cp = Math.cos(pitch),
        sp = Math.sin(pitch),
        inv = opts.current.xor;
      for (let py = 0; py < N; py++)
        for (let px = 0; px < N; px++) {
          const x = ((px + 0.5) / N) * 2.12 - 1.06,
            y = -(((py + 0.5) / N) * 2.12 - 1.06),
            r2 = x * x + y * y,
            o = (py * N + px) * 4;
          if (r2 > 1) {
            d[o + 3] = 0;
            continue;
          }
          const z = Math.sqrt(1 - r2),
            y1 = y * cp + z * sp,
            z1 = -y * sp + z * cp,
            x2 = x * cy - z1 * sy,
            z2 = x * sy + z1 * cy;
          const lon = Math.atan2(x2, z2),
            lat = Math.asin(y1);
          let idx = Math.floor(((lon + PI) / (2 * PI)) * 360 + (lat / PI) * 120) % 360;
          if (idx < 0) idx += 360;
          const col = table[idx] ?? [0, 0, 0];
          // Use the original rainbow lookup colors directly, without lighting.
          let rr = col[0],
            gg = col[1],
            bb = col[2];
          if (inv) {
            rr ^= 255;
            gg ^= 255;
            bb ^= 255;
          }
          d[o] = rr;
          d[o + 1] = gg;
          d[o + 2] = bb;
          const e = Math.sqrt(r2);
          d[o + 3] = e > 0.99 ? Math.round(((1 - e) / 0.01) * 255) : 255;
        }
      ctx.putImageData(img, 0, 0);
    };
    const loop = () => {
      if (!drag)
        yaw += matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : opts.current.spin * 0.0005;
      draw();
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      cv.removeEventListener("pointerdown", down);
      cv.removeEventListener("pointerup", up);
      cv.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      width={220}
      height={220}
      aria-label="AURELIA rotating rainbow sphere"
      className="sphere size-full cursor-grab touch-none"
    />
  );
}
