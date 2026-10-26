"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "starting" | "live" | "countdown" | "review" | "error";

/** Average brightness 0–255 of the face area, to warn about dark photos. */
function brightness(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(Math.round(w * 0.3), Math.round(h * 0.25), Math.round(w * 0.4), Math.round(h * 0.5));
  let sum = 0;
  for (let i = 0; i < data.length; i += 16) sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  return sum / (data.length / 16);
}

export default function CameraCapture({ onCapture, onClose }: { onCapture: (dataUrl: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState("");
  const [count, setCount] = useState(3);
  const [shot, setShot] = useState<string | null>(null);
  const [light, setLight] = useState<"ok" | "dark" | null>(null);
  const closeRef = useRef(onClose);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    closeRef.current = onClose;
  });

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

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
  }, []);

  useEffect(() => {
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

  function capture() {
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
  }

  function countdown() {
    setPhase("countdown");
    setCount(3);
    let n = 3;
    timerRef.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        capture();
      } else setCount(n);
    }, 800);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Take a skin scan photo" className="fixed inset-0 z-50 flex flex-col bg-ink text-paper">
      <div className="flex items-center justify-between px-4 py-3">
        <p className="font-display text-lg">Skin scan camera</p>
        <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20" aria-label="Close camera">
          Close
        </button>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden bg-black">
        {/* Live preview is mirrored like a selfie; the captured photo is not. */}
        <video ref={videoRef} playsInline muted className={`h-full w-full scale-x-[-1] object-cover ${phase === "review" ? "hidden" : ""}`} />
        {shot && phase === "review" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot} alt="Captured selfie" className="h-full w-full scale-x-[-1] object-cover" />
        )}

        {(phase === "live" || phase === "countdown") && (
          <>
            <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              <defs>
                <mask id="face-hole">
                  <rect width="100" height="100" fill="white" />
                  <ellipse cx="50" cy="48" rx="27" ry="35" fill="black" />
                </mask>
              </defs>
              <rect width="100" height="100" fill="rgba(31,42,68,0.55)" mask="url(#face-hole)" />
              <ellipse cx="50" cy="48" rx="27" ry="35" fill="none" stroke="#fff" strokeWidth="0.6" strokeDasharray="2 1.5" className="animate-[spin_30s_linear_infinite] origin-center" />
            </svg>
            <p className="absolute inset-x-0 bottom-3 text-center text-xs text-paper/90">Fit your face in the oval · face a window · no makeup</p>
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
          <div className="flex items-center justify-center gap-6">
            <button onClick={countdown} disabled={phase !== "live"} className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold disabled:opacity-40">
              3-sec timer
            </button>
            <button
              onClick={capture}
              disabled={phase !== "live"}
              aria-label="Take photo"
              className="h-18 w-18 rounded-full border-4 border-white bg-coral shadow-lg transition active:scale-90 disabled:opacity-40"
            />
            <span className="w-[86px]" />
          </div>
        )}
      </div>
    </div>
  );
}
