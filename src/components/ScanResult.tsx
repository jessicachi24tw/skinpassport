"use client";
// Result reveal: the user's photo with YouCam's per-concern masks laid on top.
// Tap a concern to light up where YouCam found it.

import { useState } from "react";
import type { ConcernKey, SkinProfile } from "@/lib/types";
import { ScoreBar } from "./ui";

const LABELS: Partial<Record<ConcernKey, string>> = {
  moisture: "Moisture",
  oiliness: "Oil balance",
  redness: "Calmness (redness)",
  age_spot: "Even tone (spots)",
  acne: "Clear skin (acne)",
  pore: "Pores",
  texture: "Texture",
  radiance: "Radiance",
};
const MAIN: ConcernKey[] = ["moisture", "oiliness", "redness", "age_spot"];

export default function ScanResult({ skin, photo, mirrored }: { skin: SkinProfile; photo: string | null; mirrored: boolean }) {
  const masks = skin.masks ?? {};
  const hasMasks = !!photo && Object.keys(masks).length > 0;
  // Start on the weakest main concern — the one that matters most for the plan.
  const weakest = MAIN.reduce((a, b) => ((skin.scores[b] ?? 100) < (skin.scores[a] ?? 100) ? b : a));
  const [active, setActive] = useState<ConcernKey | null>(hasMasks ? weakest : null);
  const extra = (Object.keys(LABELS) as ConcernKey[]).filter((k) => !MAIN.includes(k) && typeof skin.scores[k] === "number");

  return (
    <div className="mt-5 animate-[fadeUp_.5s_ease-out]">
      <div className="mb-3 flex items-end justify-between">
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
        <span className="stamp px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sea">Scanned</span>
      </div>

      <div className={hasMasks ? "grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4" : ""}>
        {hasMasks && (
          <div>
            <div className={`relative aspect-square overflow-hidden rounded-2xl bg-ink ${mirrored ? "scale-x-[-1]" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo!} alt="Your skin scan" className="absolute inset-0 h-full w-full object-cover" />
              {(Object.keys(masks) as ConcernKey[]).map((k) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={k}
                  src={masks[k]}
                  alt=""
                  aria-hidden
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${active === k ? "opacity-90" : "opacity-0"}`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-center text-[10px] text-ink-soft">{active ? `${LABELS[active]} map by YouCam AI` : "Tap a score to see its map"}</p>
          </div>
        )}

        <div className="space-y-2.5">
          {MAIN.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => hasMasks && masks[k] && setActive(active === k ? null : k)}
              aria-pressed={active === k}
              className={`block w-full rounded-lg p-1.5 text-left transition ${hasMasks && masks[k] ? "hover:bg-paper" : "cursor-default"} ${active === k ? "bg-paper ring-1 ring-ink/10" : ""}`}
            >
              <ScoreBar label={LABELS[k]!} value={skin.scores[k] as number} />
            </button>
          ))}
        </div>
      </div>

      {extra.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {extra.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => hasMasks && masks[k] && setActive(active === k ? null : k)}
              className={`rounded-full border px-2.5 py-1 text-[11px] ${active === k ? "border-ink bg-ink text-paper" : "border-line bg-white"}`}
            >
              {LABELS[k]} <b className="tabular-nums">{skin.scores[k]}</b>
            </button>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-ink-soft">Higher = healthier. Scores by YouCam AI Skin Analysis.</p>
    </div>
  );
}
