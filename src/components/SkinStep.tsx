"use client";

import { useRef, useState } from "react";
import { setApp, useApp } from "@/lib/store";
import type { SkinProfile } from "@/lib/types";
import CameraCapture from "./CameraCapture";
import ScanAnalysis, { type ScanStage } from "./ScanAnalysis";
import ScanResult from "./ScanResult";
import { Button, Card, ErrorText, StepTitle } from "./ui";

/** Shrink the photo in the browser so uploads stay small and fast. */
async function toJpegDataUrl(file: File, maxSide = 1600): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const MIN_SCAN_MS = 5200; // demo/mock results arrive instantly; keep the scan readable

export default function SkinStep({ onSkin }: { onSkin: (s: SkinProfile) => void }) {
  const { skin, photo, photoMirrored } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const [scan, setScan] = useState<{ photo: string | null; mirrored: boolean; stage: ScanStage } | null>(null);
  const [error, setError] = useState("");

  async function analyze(image: string | null, mirrored: boolean) {
    setError("");
    setScan({ photo: image, mirrored, stage: "upload" });
    const started = performance.now();
    try {
      const res = await fetch("/api/skin/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(image ? { image } : { demo: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setScan((s) => s && { ...s, stage: "analyze" });
      let result: SkinProfile | null = data.skin ?? null;
      for (let i = 0; !result && i < 40; i++) {
        await sleep(3000);
        const st = await fetch(`/api/skin/status?id=${encodeURIComponent(data.taskId)}`).then((r) => r.json());
        if (st.status === "success") result = st.skin;
        else if (st.status === "error" || st.error) throw new Error(st.error || "Analysis failed");
      }
      if (!result) throw new Error("Analysis is taking too long. Please try again.");
      const wait = MIN_SCAN_MS - (performance.now() - started);
      if (wait > 0) await sleep(wait);
      setScan((s) => s && { ...s, stage: "done" });
      await sleep(1300);
      setApp({ photo: image, photoMirrored: mirrored });
      onSkin(result);
      setScan(null);
    } catch (e) {
      setError((e as Error).message);
      setScan(null);
    }
  }

  async function onFile(file?: File) {
    if (!file) return;
    if (!/image\/(jpeg|png)/.test(file.type) && !/\.(jpe?g|png)$/i.test(file.name)) {
      setError("Please choose a JPG or PNG photo.");
      return;
    }
    try {
      await analyze(await toJpegDataUrl(file), false);
    } catch {
      setError("Could not read that photo. Try a JPG or PNG.");
    }
  }

  const busy = !!scan;

  return (
    <Card>
      <StepTitle n={1} title="Scan your skin" hint="Take a selfie now in daylight, without makeup, to see today's skin condition." />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      {scan ? (
        <ScanAnalysis photo={scan.photo} stage={scan.stage} mirrored={scan.mirrored} />
      ) : (
        <>
          <button
            onClick={() => setCamera(true)}
            className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-ink p-4 text-left text-paper transition hover:bg-ink/95"
          >
            <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-coral">
              <span className="absolute inset-0 animate-ping rounded-full bg-coral/40" />
              <svg viewBox="0 0 24 24" className="relative h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
            </span>
            <span>
              <span className="block font-semibold">{skin ? "Scan again" : "Start face scan"}</span>
              <span className="block text-xs text-paper/70">3D face mapping + YouCam AI skin analysis</span>
            </span>
          </button>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
              Upload photo
            </Button>
            <Button variant="ghost" onClick={() => analyze(null, false)} disabled={busy}>
              Use demo scan
            </Button>
          </div>
        </>
      )}
      <ErrorText>{error}</ErrorText>

      {skin && !scan && <ScanResult key={`${skin.overall}-${photo?.length ?? 0}`} skin={skin} photo={photo} mirrored={photoMirrored} />}

      {camera && (
        <CameraCapture
          onClose={() => setCamera(false)}
          onCapture={(dataUrl) => {
            setCamera(false);
            analyze(dataUrl, true);
          }}
        />
      )}
    </Card>
  );
}
