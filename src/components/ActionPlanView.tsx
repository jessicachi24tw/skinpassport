"use client";
// The action plan: Before the trip / During the trip / Shopping list,
// rendered as a phone-friendly card that can be saved as an image.

import Link from "next/link";
import { useRef, useState } from "react";
import { buildActionPlan } from "@/lib/engine/actionPlan";
import { bandFor } from "@/lib/engine/report";
import { CATALOG } from "@/lib/shop/catalog";
import { useApp } from "@/lib/store";
import ProductShot from "./ProductShot";
import { daysFromToday, useToday } from "./TripStep";
import { Rich } from "./ui";

const fmt = (iso: string, add = 0) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + add);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const BAND_DOT = { weak: "bg-coral", normal: "bg-sun", strong: "bg-sea" } as const;

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-coral first:mt-0">{children}</h2>;
}

export default function ActionPlanView() {
  const app = useApp();
  const today = useToday();
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState<"idle" | "busy" | "done" | "error">("idle");

  if (!today) return null; // client-only (dates and saved state)

  const { plan, climate, skin, trip } = app;
  if (!plan || !climate || !skin || !trip.startDate) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-2xl">No plan yet</p>
        <p className="mt-2 text-sm text-ink-soft">Plan your trip and scan your skin first.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-coral px-5 py-3 text-sm font-bold text-white">
          Start
        </Link>
      </main>
    );
  }

  const daysUntil = Math.max(0, daysFromToday(trip.startDate));
  const bag = CATALOG.filter((p) => app.bag.includes(p.id));
  const shelfNeeds = plan.items.filter((i) => i.owned.some((o) => o.meetsSpec)).map((i) => i.need.id);
  const action = buildActionPlan({
    trip,
    daysUntil,
    climate,
    origin: app.originClimate,
    report: plan.report,
    bag,
    // Shelf items that suit this trip, plus treatments (so the plan can say when to pause them).
    owned: app.shelf.filter((o) => o.treatment || o.photosensitizing || plan.items.some((i) => i.owned.some((x) => x.product.id === o.id && x.meetsSpec))),
    ownedNeeds: Array.from(new Set([...app.ownedNeeds, ...shelfNeeds])),
  });

  async function save() {
    if (!cardRef.current) return;
    setSaving("busy");
    try {
      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(cardRef.current, { pixelRatio: 3, backgroundColor: "#faf6ef", cacheBust: true });
      if (!blob) throw new Error("no image");
      const name = `skinpassport-${(trip.destination?.name ?? "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
      const file = new File([blob], name, { type: "image/png" });
      // On phones, the share sheet offers "Save Image" straight to Photos.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My SkinPassport action plan" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      setSaving("done");
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") setSaving("idle");
      else setSaving("error");
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-ink">
          ‹ Edit my picks
        </Link>
        <button onClick={save} disabled={saving === "busy"} className="rounded-xl bg-coral px-4 py-2 text-sm font-bold text-white hover:bg-coral/90 disabled:opacity-60">
          {saving === "busy" ? "Saving…" : "Save as image ↓"}
        </button>
      </div>
      {saving === "done" && <p className="mb-3 rounded-lg bg-sea-soft px-3 py-2 text-xs text-sea">Saved. On iPhone, choose “Save Image” to keep it in Photos.</p>}
      {saving === "error" && <p className="mb-3 rounded-lg bg-coral-soft px-3 py-2 text-xs text-coral">Couldn&apos;t create the image. Try again, or take a screenshot.</p>}

      {/* Everything inside this card is exported. */}
      <div ref={cardRef} className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="bg-ink px-5 pb-5 pt-5 text-paper">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-coral">SkinPassport · Action plan</p>
              <p className="mt-2 font-display text-2xl leading-tight">
                {trip.origin?.name ?? "Home"} → {trip.destination?.name}
              </p>
              <p className="mt-1 text-xs text-paper/70">
                {fmt(trip.startDate)} – {fmt(trip.startDate, trip.days - 1)} · {trip.days} days
              </p>
            </div>
            <div className="stamp px-2 py-1 text-center text-coral">
              <p className="text-xl font-bold leading-none tabular-nums">{daysUntil}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest">days to go</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
            <div className="rounded-lg bg-white/10 py-1.5">
              {Math.round(climate.tempMinC)}–{Math.round(climate.tempMaxC)}°C
            </div>
            <div className="rounded-lg bg-white/10 py-1.5">{climate.humidityPct}% humid</div>
            <div className="rounded-lg bg-white/10 py-1.5">UV {climate.uvMax}</div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-paper/80">
            {plan.report.map((r) => (
              <span key={r.key} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${BAND_DOT[bandFor(r.score)]}`} />
                {r.label.split(" (")[0]} {r.score}
              </span>
            ))}
          </div>
        </div>

        <div className="px-5 py-5">
          <Heading>Before the trip</Heading>
          <ol className="relative space-y-3 border-l-2 border-dashed border-line pl-4">
            {action.before.map((s) => (
              <li key={s.text} className="relative text-[13px] leading-snug">
                <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-paper bg-coral" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">{s.when}</p>
                <p>
                  <Rich text={s.text} />
                </p>
              </li>
            ))}
          </ol>

          <Heading>During the trip</Heading>
          <div className="space-y-3">
            {action.during.map((g) => (
              <div key={g.title} className="rounded-2xl bg-white p-3">
                <p className="mb-1 text-xs font-bold">{g.title}</p>
                <ul className="space-y-1 text-[13px] leading-snug text-ink-soft">
                  {g.steps.map((s) => (
                    <li key={s}>
                      <Rich text={s} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <Heading>Shopping list</Heading>
          {action.shopping.buy.length > 0 ? (
            <ul className="divide-y divide-line rounded-2xl bg-white">
              {action.shopping.buy.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-2.5">
                  <ProductShot product={p} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{p.brand}</p>
                    <p className="truncate text-[13px] font-medium">{p.name}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">${p.estPriceUsd}</p>
                </li>
              ))}
              <li className="flex items-center justify-between p-2.5 text-sm">
                <span className="text-ink-soft">Estimated total</span>
                <span className="font-display text-xl tabular-nums">${action.shopping.totalUsd}</span>
              </li>
            </ul>
          ) : (
            <p className="text-[13px] text-ink-soft">Nothing to buy — you&apos;re packing from home.</p>
          )}
          {action.shopping.fromHome.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sea">From home</p>
              <ul className="flex flex-wrap gap-1.5">
                {action.shopping.fromHome.map((n) => (
                  <li key={n} className="rounded-full border border-sea/30 bg-sea-soft px-2.5 py-1 text-[11px] text-sea">
                    ✓ {n}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-5 text-center text-[9px] text-ink-soft">
            Skin scores by YouCam AI · {climate.basis === "typical" ? "Typical weather for these dates" : climate.source === "demo" ? "Demo climate" : "Weather forecast"} · Prices estimated · Not medical advice
          </p>
        </div>
      </div>
    </main>
  );
}
