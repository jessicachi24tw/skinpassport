"use client";
// Landing page hero: the MediaPipe canonical face mesh, turning slowly in real 3D,
// with a coral scan line moving down the face. Static for "reduce motion".

import { useEffect, useRef } from "react";
import { FACE_EDGES, FACE_VERTICES } from "@/lib/canonicalFace";

const N = FACE_VERTICES.length / 3;

// Centre the model once.
const CENTER = (() => {
  let x = 0,
    y = 0,
    z = 0;
  for (let i = 0; i < N; i++) {
    x += FACE_VERTICES[i * 3];
    y += FACE_VERTICES[i * 3 + 1];
    z += FACE_VERTICES[i * 3 + 2];
  }
  return [x / N, y / N, z / N];
})();

function draw(ctx: CanvasRenderingContext2D, w: number, h: number, yaw: number, pitch: number, scan: number) {
  ctx.clearRect(0, 0, w, h);
  const cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch);
  // The mesh spans about ±9.7 x ±9.1 units while turning; keep a small margin so it never clips.
  const scale = Math.min(w / 21, h / 20.4);
  const px = new Float32Array(N);
  const py = new Float32Array(N);
  const pz = new Float32Array(N);
  let zmin = Infinity,
    zmax = -Infinity;
  for (let i = 0; i < N; i++) {
    const x = FACE_VERTICES[i * 3] - CENTER[0];
    const y = FACE_VERTICES[i * 3 + 1] - CENTER[1];
    const z = FACE_VERTICES[i * 3 + 2] - CENTER[2];
    const x2 = x * cy + z * sy;
    const z2 = -x * sy + z * cy;
    const y2 = y * cp - z2 * sp;
    const z3 = y * sp + z2 * cp;
    const k = 60 / (60 - z3);
    px[i] = w / 2 + x2 * k * scale;
    py[i] = h / 2 - y2 * k * scale;
    pz[i] = z3;
    if (z3 < zmin) zmin = z3;
    if (z3 > zmax) zmax = z3;
  }
  const scanY = h * (0.06 + 0.88 * scan);
  const band = h * 0.05;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(0.8, w / 420);
  for (let e = 0; e < FACE_EDGES.length; e += 2) {
    const a = FACE_EDGES[e];
    const b = FACE_EDGES[e + 1];
    const depth = ((pz[a] + pz[b]) / 2 - zmin) / (zmax - zmin);
    const glow = Math.max(0, 1 - Math.abs((py[a] + py[b]) / 2 - scanY) / band);
    ctx.strokeStyle = glow > 0.04 ? `rgba(240,140,118,${0.3 + glow * 0.65})` : `rgba(95,208,191,${0.1 + depth * depth * 0.65})`;
    ctx.beginPath();
    ctx.moveTo(px[a], py[a]);
    ctx.lineTo(px[b], py[b]);
    ctx.stroke();
  }
  const r = Math.max(1, w / 260);
  for (let i = 0; i < N; i += 2) {
    const depth = (pz[i] - zmin) / (zmax - zmin);
    if (depth < 0.5) continue;
    ctx.fillStyle = `rgba(255,255,255,${(depth - 0.4) * 1.2})`;
    ctx.beginPath();
    ctx.arc(px[i], py[i], r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Scan line
  const g = ctx.createLinearGradient(w * 0.08, 0, w * 0.92, 0);
  g.addColorStop(0, "rgba(224,103,79,0)");
  g.addColorStop(0.5, "rgba(224,103,79,0.95)");
  g.addColorStop(1, "rgba(224,103,79,0)");
  ctx.fillStyle = g;
  ctx.shadowColor = "rgba(224,103,79,0.7)";
  ctx.shadowBlur = 16;
  ctx.fillRect(w * 0.08, scanY - 0.75, w * 0.84, 1.5);
  ctx.shadowBlur = 0;
}

export default function FaceHero({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width, height };
    };
    let dims = size();
    const onResize = () => (dims = size());
    window.addEventListener("resize", onResize);
    const t0 = performance.now();
    const frame = (now: number) => {
      const t = now - t0;
      if (still) {
        draw(ctx, dims.width, dims.height, 0.38, -0.08, 0.45);
        return;
      }
      const yaw = Math.sin(t / 2600) * 0.55;
      const pitch = -0.06 + Math.sin(t / 3900) * 0.06;
      const scan = (t % 3600) / 3600;
      draw(ctx, dims.width, dims.height, yaw, pitch, scan);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} role="img" aria-label="A 3D face mesh being scanned" className={`block ${className}`} />;
}
