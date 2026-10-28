"use client";
// "Passport scan" shown while YouCam really analyzes the photo.
// The face becomes a rotating 3D mesh (MediaPipe landmarks of the photo); without
// face tracking it falls back to a scan line over the photo. The checklist follows
// the real request status — the final step only completes when results arrive.

import { useEffect, useRef, useState } from "react";
import { detect, getFaceMesh, type Landmarks, type Mesh } from "@/lib/faceMesh";

export type ScanStage = "upload" | "analyze" | "done";

const STEPS = [
  { id: "map", label: "Mapping 478 facial points" },
  { id: "upload", label: "Sending photo to YouCam AI" },
  { id: "moisture", label: "Reading moisture" },
  { id: "oil", label: "Reading oil balance" },
  { id: "redness", label: "Checking redness & sensitivity" },
  { id: "spots", label: "Detecting dark spots" },
  { id: "done", label: "Building your skin passport" },
];

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Draw landmarks as a 3D mesh rotated around the vertical axis. */
function draw3d(ctx: CanvasRenderingContext2D, mesh: Mesh, lm: Landmarks, size: number, t: number) {
  ctx.clearRect(0, 0, size, size);
  let cx = 0,
    cy = 0,
    cz = 0;
  for (const p of lm) {
    cx += p.x;
    cy += p.y;
    cz += p.z;
  }
  cx /= lm.length;
  cy /= lm.length;
  cz /= lm.length;
  const angle = Math.sin(t / 1100) * 0.65; // ±37°
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const scale = size * 1.25;
  const d = size * 2.2;
  const pts = lm.map((p) => {
    const x = (p.x - cx) * scale;
    const y = (p.y - cy) * scale;
    const z = (p.z - cz) * scale;
    const xr = x * cos + z * sin;
    const zr = -x * sin + z * cos;
    const k = d / (d + zr);
    return { x: size / 2 + xr * k, y: size / 2 + y * k, z: zr };
  });
  const scanY = size * (0.15 + 0.7 * ((Math.sin(t / 700) + 1) / 2));
  ctx.lineWidth = size / 650;
  for (const { start, end } of mesh.tessellation) {
    const a = pts[start];
    const b = pts[end];
    const depth = Math.max(0, Math.min(1, 0.5 - (a.z + b.z) / (size * 0.5)));
    const glow = Math.max(0, 1 - Math.abs((a.y + b.y) / 2 - scanY) / (size * 0.06));
    ctx.strokeStyle = glow > 0.05 ? `rgba(224,103,79,${0.35 + glow * 0.6})` : `rgba(95,208,191,${0.12 + depth * 0.45})`;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (let i = 0; i < pts.length; i += 3) {
    const p = pts[i];
    ctx.fillRect(p.x - 0.8, p.y - 0.8, 1.6, 1.6);
  }
  ctx.strokeStyle = "rgba(224,103,79,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(size * 0.12, scanY);
  ctx.lineTo(size * 0.88, scanY);
  ctx.stroke();
}

export default function ScanAnalysis({ photo, stage, mirrored }: { photo: string | null; stage: ScanStage; mirrored: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [has3d, setHas3d] = useState<boolean | null>(null);
  const [done, setDone] = useState(1); // checklist steps completed
  const t0 = useRef(0);

  // Find the face in the photo, then animate the 3D mesh.
  useEffect(() => {
    let raf = 0;
    let alive = true;
    t0.current = performance.now();
    (async () => {
      if (!photo) {
        setHas3d(false);
        return;
      }
      const mesh = await getFaceMesh();
      const img = await loadImage(photo).catch(() => null);
      const lm = mesh && img ? detect(mesh, img) : null;
      if (!alive) return;
      setHas3d(!!lm);
      if (!mesh || !lm) return;
      const size = 640;
      const tick = (now: number) => {
        const c = canvasRef.current;
        if (c) {
          if (c.width !== size) {
            c.width = size;
            c.height = size;
          }
          draw3d(c.getContext("2d")!, mesh, lm, size, now - t0.current);
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [photo]);

  // Advance the checklist with the real stage; analysis steps tick over time but never finish early.
  useEffect(() => {
    const ceiling = stage === "upload" ? 1 : stage === "analyze" ? STEPS.length - 1 : STEPS.length;
    const id = setInterval(() => setDone((d) => (d < ceiling ? d + 1 : d)), stage === "done" ? 160 : 900);
    return () => clearInterval(id);
  }, [stage]);

  const progress = Math.round((done / STEPS.length) * 100);

  return (
    <div className="overflow-hidden rounded-2xl bg-ink text-paper" role="status" aria-live="polite">
      <div className="relative mx-auto aspect-square w-full max-w-sm">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${has3d ? "opacity-15" : "opacity-60"} ${mirrored ? "scale-x-[-1]" : ""}`} />
        )}
        <canvas ref={canvasRef} className={`absolute inset-0 h-full w-full ${mirrored ? "scale-x-[-1]" : ""} ${has3d ? "" : "hidden"}`} aria-hidden />
        {!has3d && (
          <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M6 0H0V6" fill="none" stroke="#5fd0bf" strokeOpacity="0.25" strokeWidth="0.2" />
              </pattern>
            </defs>
            <ellipse cx="50" cy="48" rx="28" ry="36" fill="url(#grid)" stroke="#5fd0bf" strokeOpacity="0.7" strokeWidth="0.4" />
            <line x1="15" x2="85" y1="20" y2="20" stroke="#e0674f" strokeWidth="0.5" className="animate-[scanY_1.6s_ease-in-out_infinite_alternate]" />
          </svg>
        )}
        {/* Corner brackets */}
        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {[
            [8, 8, 1, 1],
            [92, 8, -1, 1],
            [8, 92, 1, -1],
            [92, 92, -1, -1],
          ].map(([x, y, sx, sy]) => (
            <path key={`${x}-${y}`} d={`M${x} ${y + 6 * sy} V${y} H${x + 6 * sx}`} fill="none" stroke="#5fd0bf" strokeWidth="0.7" />
          ))}
        </svg>
        <div className="absolute left-3 top-3 font-mono text-[10px] leading-tight text-[#5fd0bf]">
          <p>SKIN-ID SCAN</p>
          <p className="text-paper/60">{has3d ? "3D MESH · 478 PTS" : "SURFACE SCAN"}</p>
        </div>
        <div className="absolute right-3 top-3 font-mono text-xl tabular-nums text-paper">{progress}%</div>
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="mb-3 h-1 rounded-full bg-white/10">
          <div className="h-1 rounded-full bg-coral transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
        <ul className="grid grid-cols-1 gap-1 text-[13px]">
          {STEPS.map((s, i) => {
            const state = i < done ? "done" : i === done ? "active" : "todo";
            const label = s.id === "map" && has3d === false ? "Locating your face" : s.label;
            return (
              <li key={s.id} className={`flex items-center gap-2 ${state === "todo" ? "text-paper/35" : ""}`}>
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${state === "done" ? "bg-[#5fd0bf] text-ink" : state === "active" ? "border border-coral" : "border border-white/20"}`}>
                  {state === "done" ? "✓" : state === "active" ? <span className="h-1.5 w-1.5 animate-ping rounded-full bg-coral" /> : null}
                </span>
                {label}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[10px] text-paper/50">Skin analysis by YouCam AI{has3d ? " · 3D face mapping runs on your device" : ""}</p>
      </div>
    </div>
  );
}
