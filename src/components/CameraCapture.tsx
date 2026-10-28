"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { alignment, detect, getFaceMesh, type Landmarks, type Mesh } from "@/lib/faceMesh";

type Phase = "starting" | "live" | "countdown" | "review" | "error";
const HOLD_MS = 1400; // aligned this long → auto capture

/** Average brightness 0–255 of the face area, to warn about dark photos. */
function brightness(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(Math.round(w * 0.3), Math.round(h * 0.25), Math.round(w * 0.4), Math.round(h * 0.5));
  let sum = 0;
  for (let i = 0; i < data.length; i += 16) sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  return sum / (data.length / 16);
}

/** Landmarks in the full video frame → coordinates in the centre square crop (what we capture). */
function toSquare(lm: Landmarks, vw: number, vh: number): Landmarks {
  const side = Math.min(vw, vh);
  const ox = (vw - side) / 2;
  const oy = (vh - side) / 2;
  return lm.map((p) => ({ ...p, x: (p.x * vw - ox) / side, y: (p.y * vh - oy) / side }));
}

function drawMesh(ctx: CanvasRenderingContext2D, mesh: Mesh, lm: Landmarks, w: number, h: number, ok: boolean, t: number) {
  ctx.clearRect(0, 0, w, h);
  const color = ok ? "95,208,191" : "255,255,255";
  // Thin tessellation, brighter near the moving scan line.
  const scanY = ((t / 1600) % 1) * h;
  ctx.lineWidth = Math.max(0.6, w / 900);
  for (const { start, end } of mesh.tessellation) {
    const a = lm[start];
    const b = lm[end];
    const y = ((a.y + b.y) / 2) * h;
    const glow = Math.max(0, 1 - Math.abs(y - scanY) / (h * 0.08));
    ctx.strokeStyle = `rgba(${color},${0.16 + glow * 0.55})`;
    ctx.beginPath();
    ctx.moveTo(a.x * w, a.y * h);
    ctx.lineTo(b.x * w, b.y * h);
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(${color},0.9)`;
  ctx.lineWidth = Math.max(1.4, w / 450);
  ctx.beginPath();
  for (const { start, end } of mesh.oval) {
    ctx.moveTo(lm[start].x * w, lm[start].y * h);
    ctx.lineTo(lm[end].x * w, lm[end].y * h);
  }
  ctx.stroke();
}

export default function CameraCapture({ onCapture, onClose }: { onCapture: (dataUrl: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const alignedSince = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("starting");
  const closeRef = useRef(onClose);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [phase, setPhaseState] = useState<Phase>("starting");
  const [error, setError] = useState("");
  const [count, setCount] = useState(3);
  const [shot, setShot] = useState<string | null>(null);
  const [light, setLight] = useState<"ok" | "dark" | null>(null);
  const [meshState, setMeshState] = useState<"loading" | "ready" | "off">("loading");
  const [hint, setHint] = useState("Looking for your face…");
  const [hold, setHold] = useState(0); // 0–1 progress of the auto-capture hold
  const [auto, setAuto] = useState(true);
  const autoRef = useRef(auto);

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };

  useEffect(() => {
    closeRef.current = onClose;
    autoRef.current = auto;
  });

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const capture = useCallback(() => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    // Square crop from the centre, max 1600px — what YouCam expects for a face scan.
    const side = Math.min(v.videoWidth, v.videoHeight);
    const out = Math.min(1600, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, out, out);
    setLight(brightness(ctx, out, out) < 70 ? "dark" : "ok");
    setShot(canvas.toDataURL("image/jpeg", 0.92));
    setPhase("review");
    setHold(0);
    alignedSince.current = null;
  }, []);

  const countdown = useCallback(() => {
    if (phaseRef.current !== "live") return;
    setPhase("countdown");
    setCount(3);
    let n = 3;
    timerRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        capture();
      } else setCount(n);
    }, 700);
  }, [capture]);

  // Per-frame face tracking + HUD. Kept in a ref so the frame callback always sees the latest state.
  const loopRef = useRef<() => void>(() => {});
  const frame = useCallback(() => loopRef.current(), []);
  useEffect(() => {
    loopRef.current = () => {
      const v = videoRef.current;
      const c = canvasRef.current;
      const mesh = meshRef.current;
      if (v && c && mesh && v.videoWidth && (phaseRef.current === "live" || phaseRef.current === "countdown")) {
        const side = Math.min(v.videoWidth, v.videoHeight);
        if (c.width !== side) {
          c.width = side;
          c.height = side;
        }
        const raw = detect(mesh, v);
        const ctx = c.getContext("2d")!;
        if (raw) {
          const lm = toSquare(raw, v.videoWidth, v.videoHeight);
          const a = alignment(lm);
          drawMesh(ctx, mesh, lm, side, side, a.ok, performance.now());
          setHint(a.hint);
          if (a.ok && phaseRef.current === "live" && autoRef.current) {
            alignedSince.current ??= performance.now();
            const p = Math.min(1, (performance.now() - alignedSince.current) / HOLD_MS);
            setHold(p);
            if (p >= 1) countdown();
          } else if (!a.ok) {
            alignedSince.current = null;
            setHold(0);
          }
        } else {
          ctx.clearRect(0, 0, c.width, c.height);
          alignedSince.current = null;
          setHold(0);
          setHint("Looking for your face…");
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    };
  });

  const start = useCallback(async () => {
    setPhase("starting");
    setShot(null);
    setLight(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("live");
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(frame);
    } catch (e) {
      const name = (e as DOMException)?.name;
      setError(
        name === "NotAllowedError"
          ? "Camera permission was blocked. Allow camera access in your browser settings, or upload a photo instead."
          : name === "NotFoundError"
            ? "No camera found on this device. Upload a photo instead."
            : "The camera isn't available here (it needs HTTPS or localhost). Upload a photo instead.",
      );
      setPhase("error");
    }
  }, [frame]);

  useEffect(() => {
    getFaceMesh().then((m) => {
      meshRef.current = m;
      setMeshState(m ? "ready" : "off");
    });
    // Starting the camera is an external side effect; state updates happen in its async callbacks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    start();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => {
      stop();
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("keydown", onKey);
    };
  }, [start]);

  const tracking = meshState === "ready";
  const live = phase === "live" || phase === "countdown";

  return (
    <div role="dialog" aria-modal="true" aria-label="Take a skin scan photo" className="fixed inset-0 z-50 flex flex-col bg-ink text-paper">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="font-display text-lg leading-tight">Skin scan</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#5fd0bf]">Biometric check · Gate 1</p>
        </div>
        <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20" aria-label="Close camera">
          Close
        </button>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden bg-black">
        {/* Live preview is mirrored like a selfie; the captured photo is not. */}
        <video ref={videoRef} playsInline muted className={`h-full w-full scale-x-[-1] object-cover ${phase === "review" ? "hidden" : ""}`} />
        <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full scale-x-[-1] ${live && tracking ? "" : "hidden"}`} aria-hidden />
        {shot && phase === "review" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot} alt="Captured selfie" className="h-full w-full scale-x-[-1] object-cover" />
        )}

        {live && (
          <>
            {/* Passport-scanner HUD: dimmed surround, oval guide, corner brackets, sweeping line. */}
            <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <mask id="face-hole">
                  <rect width="100" height="100" fill="white" />
                  <ellipse cx="50" cy="48" rx="27" ry="35" fill="black" />
                </mask>
              </defs>
              <rect width="100" height="100" fill="rgba(31,42,68,0.5)" mask="url(#face-hole)" />
              <ellipse cx="50" cy="48" rx="27" ry="35" fill="none" stroke={hold > 0 ? "#5fd0bf" : "#fff"} strokeOpacity="0.35" strokeWidth="0.5" />
              {hold > 0 && (
                <ellipse cx="50" cy="48" rx="27" ry="35" fill="none" stroke="#5fd0bf" strokeWidth="1.1" pathLength={1} strokeDasharray={`${hold} 1`} transform="rotate(-90 50 48)" />
              )}
              {[
                [16, 9, 1, 1],
                [84, 9, -1, 1],
                [16, 87, 1, -1],
                [84, 87, -1, -1],
              ].map(([x, y, sx, sy]) => (
                <path key={`${x}-${y}`} d={`M${x} ${y + 7 * sy} V${y} H${x + 7 * sx}`} fill="none" stroke="#5fd0bf" strokeWidth="0.8" />
              ))}
              {!tracking && <line x1="20" x2="80" y1="20" y2="20" stroke="#5fd0bf" strokeWidth="0.4" className="animate-[scanY_2.2s_ease-in-out_infinite_alternate]" />}
            </svg>
            <div className="absolute inset-x-0 top-3 flex justify-center">
              <span className="rounded-full bg-ink/70 px-3 py-1 text-[11px] font-semibold tracking-wide">
                {meshState === "loading" ? "Loading face tracking…" : tracking ? hint : "Fit your face in the oval"}
              </span>
            </div>
            <p className="absolute inset-x-0 bottom-3 text-center text-[11px] text-paper/85">Face a window · no makeup · glasses off</p>
          </>
        )}
        {phase === "countdown" && <p className="absolute inset-0 flex items-center justify-center font-display text-8xl text-white drop-shadow">{count}</p>}
        {phase === "starting" && <p className="absolute inset-0 flex items-center justify-center text-sm text-paper/80">Starting camera…</p>}
        {phase === "error" && <p className="absolute inset-0 flex items-center justify-center p-8 text-center text-sm leading-relaxed">{error}</p>}
      </div>

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        {phase === "review" ? (
          <>
            {light === "dark" && <p className="mb-3 rounded-lg bg-sun-soft px-3 py-2 text-sm text-[#7a5410]">This photo looks dark — results are more accurate in daylight. Retake?</p>}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={start} className="rounded-xl border border-white/30 py-3 text-sm font-semibold hover:bg-white/10">
                Retake
              </button>
              <button
                onClick={() => {
                  stop();
                  if (shot) onCapture(shot);
                }}
                className="rounded-xl bg-coral py-3 text-sm font-bold text-white hover:bg-coral/90"
              >
                Analyze this photo
              </button>
            </div>
          </>
        ) : phase === "error" ? (
          <button onClick={onClose} className="w-full rounded-xl bg-coral py-3 text-sm font-bold text-white">
            Back to upload
          </button>
        ) : (
          <>
            <div className="flex items-center justify-center gap-6">
              <button onClick={countdown} disabled={phase !== "live"} className="w-[86px] rounded-full border border-white/30 px-3 py-2 text-xs font-semibold disabled:opacity-40">
                3-sec timer
              </button>
              <button
                onClick={capture}
                disabled={!live}
                aria-label="Take photo"
                className="h-18 w-18 rounded-full border-4 border-white bg-coral shadow-lg transition active:scale-90 disabled:opacity-40"
              />
              {tracking ? (
                <label className="flex w-[86px] cursor-pointer items-center gap-1.5 text-[11px] text-paper/80">
                  <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="h-3.5 w-3.5 accent-[#5fd0bf]" />
                  Auto-capture
                </label>
              ) : (
                <span className="w-[86px]" />
              )}
            </div>
            {tracking && auto && <p className="mt-3 text-center text-[11px] text-paper/60">Hold still inside the oval and the photo is taken for you.</p>}
          </>
        )}
      </div>
    </div>
  );
}
