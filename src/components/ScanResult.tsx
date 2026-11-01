"use client";
// Skin report: photo with YouCam's masks, skin type, and InBody-style bars for the 8 YouCam scores.
// Each bar shows the reference zones in grey (Weak <45 · Normal 45–69 · Strong ≥70),
// the user's score, and the trip risk for that concern.

import { useState } from "react";
import { BANDS, buildReport, CORE } from "@/lib/engine/report";
import { describeSkinType, traitsOf } from "@/lib/engine/skinType";
import type { Band, Climate, ConcernKey, ConcernReport, RiskLevel, SkinProfile, TripInput } from "@/lib/types";

const BAND_STYLE: Record<Band, { label: string; bar: string; chip: string }> = {
  weak: { label: "Weak", bar: "bg-coral", chip: "bg-coral-soft text-coral" },
  normal: { label: "Normal", bar: "bg-sun", chip: "bg-sun-soft text-[#8a5d10]" },
  strong: { label: "Strong", bar: "bg-sea", chip: "bg-sea-soft text-sea" },
};
const RISK_STYLE: Record<RiskLevel, string> = {
  high: "border-coral text-coral",
  medium: "border-[#c48a1e] text-[#8a5d10]",
  low: "border-sea/50 text-sea",
};
/** "More measures": these four, in this order, as one flat list. */
const MORE: ConcernKey[] = ["texture", "radiance", "pore", "acne"];

/** One InBody-style row. */
function BandBar({ r, active, onClick, clickable, showRisk, compact }: { r: ConcernReport; active: boolean; onClick: () => void; clickable: boolean; showRisk: boolean; compact?: boolean }) {
  const s = BAND_STYLE[r.band];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`block w-full rounded-xl p-2 text-left transition ${clickable ? "hover:bg-paper" : "cursor-default"} ${active ? "bg-paper ring-1 ring-ink/10" : ""}`}
    >
      <div className={`${compact ? "mb-1" : "mb-1.5"} flex items-center justify-between gap-2`}>
        <span className={compact ? "text-[13px]" : "text-sm font-medium"}>
          {r.label}
          {clickable && <span className="ml-1 text-[10px] text-sea" aria-hidden>◉</span>}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-base font-bold tabular-nums">{r.score}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.chip}`}>{s.label}</span>
        </span>
      </div>
      {/* Reference zones in grey, the score bar on top. */}
      <div className={`relative ${compact ? "h-2" : "h-3"} overflow-hidden rounded-full`}>
        <div className="absolute inset-0 flex">
          <div className="h-full bg-[#e9e5dd]" style={{ width: `${BANDS.weakBelow}%` }} />
          <div className="h-full border-x border-white bg-[#dcd7cd]" style={{ width: `${BANDS.strongFrom - BANDS.weakBelow}%` }} />
          <div className="h-full flex-1 bg-[#cfc9be]" />
        </div>
        <div className={`absolute ${compact ? "inset-y-[2px]" : "inset-y-[3px]"} left-0 rounded-full ${s.bar} transition-[width] duration-700`} style={{ width: `${Math.max(3, r.score)}%` }} />
      </div>
      {showRisk && (!compact || r.risk !== "low") && (
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-soft">
          <span className={`rounded-full border px-1.5 py-px text-[10px] font-bold uppercase tracking-wider ${RISK_STYLE[r.risk]}`}>
            Trip risk {r.risk === "high" ? "↑ High" : r.risk === "medium" ? "Medium" : "Low"}
          </span>
          <span className="truncate">{r.riskReason}</span>
        </p>
      )}
    </button>
  );
}

/** Zone labels shown once above the bars, aligned with the grey zones. */
function ZoneScale() {
  return (
    <div className="relative mx-2 mb-1 h-4 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
      <span className="absolute left-0">Weak</span>
      <span className="absolute -translate-x-1/2" style={{ left: `${(BANDS.weakBelow + BANDS.strongFrom) / 2}%` }}>
        Normal
      </span>
      <span className="absolute right-0">Strong</span>
      <span className="absolute -translate-x-1/2 text-[9px] font-normal" style={{ left: `${BANDS.weakBelow}%`, top: 10 }}>
        {BANDS.weakBelow}
      </span>
      <span className="absolute -translate-x-1/2 text-[9px] font-normal" style={{ left: `${BANDS.strongFrom}%`, top: 10 }}>
        {BANDS.strongFrom}
      </span>
    </div>
  );
}

export default function ScanResult({
  skin,
  photo,
  mirrored,
  climate,
  origin,
  trip,
}: {
  skin: SkinProfile;
  photo: string | null;
  mirrored: boolean;
  climate: Climate | null;
  origin: Climate | null;
  trip: TripInput;
}) {
  const report = buildReport(skin.scores, climate, trip, origin);
  const masks = skin.masks ?? {};
  const hasMasks = !!photo && Object.keys(masks).length > 0;
  const weakest = [...report].sort((a, b) => a.score - b.score)[0];
  const [active, setActive] = useState<ConcernKey | null>(hasMasks && masks[weakest.key] ? weakest.key : null);
  const core = report.filter((r) => CORE.includes(r.key));
  const more = MORE.map((k) => report.find((r) => r.key === k)).filter((r): r is ConcernReport => !!r);
  const [showAll, setShowAll] = useState(true);
  const tr = traitsOf(skin.skinType);
  const typeNote =
    tr.base === "dry"
      ? "Dry type: we favour rich creams and barrier care."
      : tr.base === "oily"
        ? "Oily type: we favour light gels and skip heavy creams."
        : tr.base === "combination"
          ? "Combination type: gel on the T-zone, richer cream on the cheeks."
          : null;
  const pick = (k: ConcernKey) => hasMasks && masks[k] && setActive(active === k ? null : k);

  return (
    <div className="mt-5 animate-[fadeUp_.5s_ease-out]">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{skin.label}</p>
          {describeSkinType(skin.skinType) && (
            <p className="mt-1 text-sm">
              Skin type <b>{describeSkinType(skin.skinType)}</b>
            </p>
          )}
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
      {(typeNote || tr.redness) && (
        <p className="mb-3 rounded-lg bg-paper px-3 py-2 text-[11px] text-ink-soft">
          {typeNote}
          {typeNote && tr.redness ? " " : ""}
          {tr.redness ? "Redness-prone: gentle, fragrance-free care comes first." : ""}
        </p>
      )}

      {hasMasks && (
        <div className="mb-4">
          <div className={`relative mx-auto aspect-[3/4] w-3/5 max-w-[280px] overflow-hidden rounded-2xl bg-ink ${mirrored ? "scale-x-[-1]" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo!} alt="Your skin scan" className="absolute inset-0 h-full w-full object-cover" />
            {(Object.keys(masks) as ConcernKey[]).map((k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={k} src={masks[k]} alt="" aria-hidden className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${active === k ? "opacity-90" : "opacity-0"}`} />
            ))}
          </div>
          <p className="mt-1.5 text-center text-[10px] text-ink-soft">{active ? `${report.find((r) => r.key === active)?.label ?? active} map by YouCam AI` : "Tap a score marked ◉ to see its map"}</p>
        </div>
      )}

      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-coral">Travel-sensitive</p>
      <ZoneScale />
      <div className="space-y-1">
        {core.map((r) => (
          <BandBar key={r.key} r={r} active={active === r.key} onClick={() => pick(r.key)} clickable={hasMasks && !!masks[r.key]} showRisk={!!climate} />
        ))}
      </div>

      {more.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <button type="button" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="flex w-full items-center justify-between text-left">
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-ink-soft">
              More measures · {more.length}
            </span>
            <span className="text-xs font-semibold text-sea">{showAll ? "Hide" : "Show"}</span>
          </button>
          {showAll && (
            <div className="mt-2 space-y-1">
              {more.map((r) => (
                <BandBar key={r.key} r={r} compact active={active === r.key} onClick={() => pick(r.key)} clickable={hasMasks && !!masks[r.key]} showRisk={!!climate} />
              ))}
            </div>
          )}
        </div>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        Scores 1–100 by YouCam AI Skin Analysis (higher = healthier). Grey zones are SkinPassport reference ranges, not medical norms. <b>Trip risk</b> combines today&apos;s score
        with your destination&apos;s climate.
      </p>
    </div>
  );
}
