"use client";
// Step 4, "Your travel skin plan", as one picture of your face with two views:
//   Today               your scan, coral where this trip puts skin at risk, green where it's fine
//   Without protection  an illustration of those risks getting worse (drawn in the browser, mild and realistic)
// Tags are a few words each; the weather itself is in the strip above.

import { useEffect, useMemo, useRef, useState } from "react";
import { cropToFace } from "@/lib/faceCrop";
import { detect, getFaceMesh } from "@/lib/faceMesh";
import { CONCERN_ZONES, drawMarks, drawSkip, SHORT, zonesOf, type Zones } from "@/lib/skinEffects";
import type { ConcernKey, ConcernReport, PlanResult } from "@/lib/types";

type View = "today" | "skip";
const VIEWS: { id: View; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "skip", label: "Without protection" },
];
const RISK_ORDER = { high: 0, medium: 1, low: 2 } as const;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

type Tag = { key: string; text: string; sub?: string; tone: "bad" | "good"; pin: ConcernKey };

/** Labels down the left and right edges, each with a line to its spot on the face. */
function Tags({ tags, zones, w, h, mirrored }: { tags: Tag[]; zones: Zones | null; w: number; h: number; mirrored: boolean }) {
  if (!zones) return null;
  const placed = tags.map((t) => {
    const z = zones[CONCERN_ZONES[t.pin].pin];
    const x = (mirrored ? w - z.x : z.x) / w;
    return { ...t, x, y: z.y / h, left: x < 0.5 };
  });
  for (const side of [true, false]) {
    const col = placed.filter((p) => p.left === side).sort((a, b) => a.y - b.y);
    let last = -1;
    for (const p of col) {
      p.y = Math.min(0.9, Math.max(0.08, p.y, last + 0.15));
      last = p.y;
    }
  }
  return (
    <>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {placed.map((p) => {
          const z = zones[CONCERN_ZONES[p.pin].pin];
          const px = ((mirrored ? w - z.x : z.x) / w) * 100;
          const py = (z.y / h) * 100;
          return <line key={p.key} x1={px} y1={py} x2={p.left ? 14 : 86} y2={p.y * 100} stroke="white" strokeWidth="0.35" vectorEffect="non-scaling-stroke" opacity="0.9" />;
        })}
      </svg>
      {placed.map((p) => {
        const z = zones[CONCERN_ZONES[p.pin].pin];
        return (
          <span
            key={`dot-${p.key}`}
            className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${p.tone === "bad" ? "bg-coral" : "bg-leaf"}`}
            style={{ left: `${((mirrored ? w - z.x : z.x) / w) * 100}%`, top: `${(z.y / h) * 100}%` }}
          />
        );
      })}
      {placed.map((p) => (
        <span
          key={p.key}
          className={`absolute max-w-[46%] -translate-y-1/2 rounded-lg px-2 py-1 text-[11px] font-bold leading-tight text-white shadow-md animate-[fadeUp_.35s_ease-out_both] ${p.left ? "left-1.5" : "right-1.5 text-right"} ${p.tone === "bad" ? "bg-coral" : "bg-leaf"}`}
          style={{ top: `${p.y * 100}%` }}
        >
          {p.text}
          {p.sub && <span className="block text-[10px] font-medium text-white/90">{p.sub}</span>}
        </span>
      ))}
    </>
  );
}

export default function TripSkinVisual({ plan, photo, mirrored }: { plan: PlanResult; photo: string | null; mirrored: boolean }) {
  const [view, setView] = useState<View>("today");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [base, setBase] = useState<{ img: HTMLImageElement; zones: Zones | null } | null>(null);

  // What to show: the concerns this trip puts at risk, and one that's fine.
  const risks = useMemo(
    () =>
      plan.report
        .filter((r) => r.risk !== "low")
        .sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || a.score - b.score)
        .slice(0, 4),
    [plan.report],
  );
  const good = useMemo(() => plan.report.filter((r) => r.risk === "low").sort((a, b) => b.score - a.score)[0] as ConcernReport | undefined, [plan.report]);

  // A square crop around the face, plus face zones from MediaPipe.
  useEffect(() => {
    if (!photo) return;
    let alive = true;
    (async () => {
      const img = await loadImage(await cropToFace(photo)).catch(() => null);
      if (!img || !alive) return;
      const mesh = await getFaceMesh();
      const lm = mesh ? detect(mesh, img) : null;
      if (alive) setBase({ img, zones: lm ? zonesOf(lm, img.naturalWidth, img.naturalHeight) : null });
    })();
    return () => {
      alive = false;
    };
  }, [photo]);

  // Draw the current view.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !base) return;
    const { img, zones } = base;
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    if (!zones) return;
    if (view === "today") drawMarks(ctx, zones, [...risks.map((r) => ({ key: r.key, good: false })), ...(good ? [{ key: good.key, good: true }] : [])]);
    else drawSkip(ctx, zones, risks);
  }, [base, view, risks, good]);

  const tags: Tag[] =
    view === "today"
      ? [
          ...risks.map((r) => ({ key: r.key, text: SHORT[r.key].bad, sub: r.riskReason, tone: "bad" as const, pin: r.key })),
          ...(good ? [{ key: good.key, text: `${SHORT[good.key].good} ✓`, tone: "good" as const, pin: good.key }] : []),
        ]
      : risks.map((r) => ({ key: r.key, text: SHORT[r.key].skip, tone: "bad" as const, pin: r.key }));

  return (
    <div>
      <div role="tablist" aria-label="Compare" className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-paper p-1 text-xs font-semibold">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={`rounded-lg py-2 transition ${view === v.id ? (v.id === "skip" ? "bg-coral text-white shadow-sm" : "bg-white text-ink shadow-sm") : "text-ink-soft"}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {photo ? (
        <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl bg-ink">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover" style={mirrored ? { transform: "scaleX(-1)" } : undefined} aria-label={`Your face: ${VIEWS.find((v) => v.id === view)!.label}`} role="img" />
          {!base && <p className="absolute inset-0 flex items-center justify-center text-xs text-paper/70">Mapping your face…</p>}
          {base && <Tags key={view} tags={tags} zones={base.zones} w={base.img.naturalWidth} h={base.img.naturalHeight} mirrored={mirrored} />}
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/70 px-2.5 py-0.5 text-[10px] font-semibold text-paper">
            {view === "today" ? "YouCam AI scan" : "Illustration, not a prediction"}
          </span>
        </div>
      ) : (
        // Demo scan (no photo): the same tags, as a list.
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <li key={t.key} className={`rounded-full px-2.5 py-1 text-[12px] font-bold text-white ${t.tone === "bad" ? "bg-coral" : "bg-leaf"}`}>
              {t.text}
              {t.sub && <span className="font-medium text-white/90"> · {t.sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
