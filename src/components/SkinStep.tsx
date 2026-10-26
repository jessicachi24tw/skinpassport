"use client";

import { useRef, useState } from "react";
import type { SkinProfile } from "@/lib/types";
import CameraCapture from "./CameraCapture";
import { Button, Card, ErrorText, ScoreBar, StepTitle } from "./ui";

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

export default function SkinStep({ skin, onSkin }: { skin: SkinProfile | null; onSkin: (s: SkinProfile) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function analyze(body: { image?: string; demo?: boolean }) {
    setError("");
    setBusy(body.demo ? "Loading demo scan…" : "Uploading photo…");
    try {
      const res = await fetch("/api/skin/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      if (data.skin) return onSkin(data.skin);
      setBusy("YouCam AI is analyzing your skin…");
      for (let i = 0; i < 40; i++) {
        await sleep(3000);
        const s = await fetch(`/api/skin/status?id=${encodeURIComponent(data.taskId)}`).then((r) => r.json());
        if (s.status === "success") return onSkin(s.skin);
        if (s.status === "error" || s.error) throw new Error(s.error || "Analysis failed");
      }
      throw new Error("Analysis is taking too long. Please try again.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onFile(file?: File) {
    if (!file) return;
    if (!/image\/(jpeg|png)/.test(file.type) && !/\.(jpe?g|png)$/i.test(file.name)) {
      setError("Please choose a JPG or PNG photo.");
      return;
    }
    try {
      const dataUrl = await toJpegDataUrl(file);
      setPreview(dataUrl);
      await analyze({ image: dataUrl });
    } catch {
      setError("Could not read that photo. Try a JPG or PNG.");
    }
  }

  return (
    <Card>
      <StepTitle n={1} title="Scan your skin" hint="Take a selfie now in daylight, without makeup, to see today's skin condition." />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />

      <button
        onClick={() => setCamera(true)}
        disabled={!!busy}
        className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-ink p-4 text-left text-paper transition hover:bg-ink/95 disabled:opacity-50"
      >
        <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-coral">
          <span className="absolute inset-0 animate-ping rounded-full bg-coral/40 group-disabled:hidden" />
          <svg viewBox="0 0 24 24" className="relative h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        </span>
        <span>
          <span className="block font-semibold">Take a photo now</span>
          <span className="block text-xs text-paper/70">Opens your camera with a face guide</span>
        </span>
      </button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={() => fileRef.current?.click()} disabled={!!busy}>
          Upload photo
        </Button>
        <Button variant="ghost" onClick={() => analyze({ demo: true })} disabled={!!busy}>
          Use demo scan
        </Button>
      </div>

      {busy && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-paper p-3 text-sm text-ink-soft">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-10 w-10 rounded-lg object-cover" />
          )}
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-ink/20 border-t-ink" /> {busy}
        </div>
      )}
      <ErrorText>{error}</ErrorText>

      {skin && !busy && (
        <div className="mt-5 flex animate-[fadeUp_.4s_ease-out] gap-4">
          {preview && skin.source === "youcam" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your selfie" className="h-28 w-20 shrink-0 rounded-xl object-cover" />
          )}
          <div className="flex-1 space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{skin.label}</p>
              {skin.overall != null && (
                <p className="mt-1 text-sm">
                  Overall <b className="tabular-nums">{skin.overall}</b>
                  {skin.skinAge != null && (
                    <>
                      {" "}
                      · Skin age <b className="tabular-nums">{skin.skinAge}</b>
                    </>
                  )}
                </p>
              )}
            </div>
            <ScoreBar label="Moisture" value={skin.scores.moisture} />
            <ScoreBar label="Oil balance" value={skin.scores.oiliness} />
            <ScoreBar label="Calmness (redness)" value={skin.scores.redness} />
            <ScoreBar label="Even tone (spots)" value={skin.scores.age_spot} />
            <p className="text-xs text-ink-soft">Higher = healthier. Scores by YouCam AI Skin Analysis.</p>
          </div>
        </div>
      )}

      {camera && (
        <CameraCapture
          onClose={() => setCamera(false)}
          onCapture={(dataUrl) => {
            setCamera(false);
            setPreview(dataUrl);
            analyze({ image: dataUrl });
          }}
        />
      )}
    </Card>
  );
}
