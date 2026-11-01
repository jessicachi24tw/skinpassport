"use client";
// The action plan: a 3D "passport" with a Well protected / Scan passed stamp,
// then Before the trip and a visual During the trip, saved as a phone-size image.

import Link from "next/link";
import { useRef, useState } from "react";
import { buildActionPlan, type DuringGroup, type DuringStep } from "@/lib/engine/actionPlan";
import { bandFor, CORE } from "@/lib/engine/report";
import { simKey, simulationPlan } from "@/lib/engine/simulation";
import type { Need, NeedId, Product } from "@/lib/types";
import { usePassportAutosave, type Snapshot } from "@/lib/passports";
import { allProducts, bagProducts, useApp } from "@/lib/store";
import ProductShot from "./ProductShot";
import SkinSimulation, { useSkinSimulation } from "./SkinSimulation";
import { daysFromToday, useToday } from "./TripStep";
import { Rich } from "./ui";

const fmt = (iso: string, add = 0) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + add);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const BAND_DOT = { weak: "bg-coral", normal: "bg-sun", strong: "bg-sea" } as const;

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-coral first:mt-0">{children}</h2>;
}

/** A tilted 3D passport data page, stamped when every must-pack is covered. */
/** Props for the passport page from a saved plan (used here and in My passports). */
export function stampPropsOf(s: Snapshot) {
  const plan = s.plan!;
  const bag = bagProducts(s);
  const shelfNeeds = plan.items.filter((i) => i.owned.some((o) => o.meetsSpec)).map((i) => i.need.id);
  const home = new Set<NeedId>([...s.ownedNeeds, ...shelfNeeds]);
  const mustNeeds = plan.needs.filter((n) => n.tier === "must");
  const missing = mustNeeds.filter((n) => !home.has(n.id) && !bag.some((p) => p.needs.includes(n.id)));
  const start = s.trip.startDate;
  return {
    photo: (s.simulation && !s.simulation.mock ? s.simulation.image : null) ?? s.photo,
    after: !!s.simulation && !s.simulation.mock,
    skinType: s.skin?.skinType?.whole ?? null,
    mirrored: s.photoMirrored,
    destination: s.trip.destination?.name ?? "Your trip",
    dates: start ? `${fmt(start)} – ${fmt(start, s.trip.days - 1)}` : "",
    covered: mustNeeds.length - missing.length,
    must: mustNeeds.length,
    missing,
  };
}

export function PassportStamp({
  photo,
  after,
  skinType,
  mirrored,
  destination,
  dates,
  covered,
  must,
  missing,
  compact,
}: {
  compact?: boolean;
  photo: string | null;
  after?: boolean;
  skinType?: string | null;
  mirrored: boolean;
  destination: string;
  dates: string;
  covered: number;
  must: number;
  missing: Need[];
}) {
  const protectedAll = missing.length === 0;
  const ink = protectedAll ? "#2f9a57" : "#e0674f";
  const mrz = `P<SKN${destination.toUpperCase().replace(/[^A-Z]/g, "<")}`.padEnd(44, "<").slice(0, 44);
  return (
    <div className="pb-2 pt-1" style={{ perspective: "900px" }}>
      <div className="relative mx-auto w-[92%]" style={{ transformStyle: "preserve-3d", animation: compact ? undefined : "floatTilt 6s ease-in-out infinite", transform: compact ? "rotateX(18deg) rotateZ(-6deg)" : undefined }}>
        {/* Cover and page edges give the booklet its thickness */}
        <div className="absolute inset-0 translate-x-[6px] translate-y-[10px] rounded-2xl bg-ink shadow-[0_18px_30px_-12px_rgba(31,42,68,0.55)]" aria-hidden />
        <div className="absolute inset-0 translate-x-[3px] translate-y-[6px] rounded-2xl border border-line bg-[#efe8dc]" aria-hidden />
        <div className="absolute inset-0 translate-x-[1.5px] translate-y-[3px] rounded-2xl border border-line bg-[#f5efe5]" aria-hidden />

        <div className="relative overflow-hidden rounded-2xl border border-line bg-[#fdfaf4] p-3.5">
          {/* Guilloche-style background lines */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.35]"
            style={{ backgroundImage: "repeating-radial-gradient(circle at 80% 20%, transparent 0 7px, #d9e8e4 7px 8px)" }}
          />
          <div className="relative flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-ink-soft">SkinPassport</p>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-ink-soft">Travel skin check</p>
          </div>
          <div className="relative mt-2 flex gap-3">
            <div className="relative h-[86px] w-[68px] shrink-0 overflow-hidden rounded-md border border-line bg-[#e9e2d6]">
              {after && <span className="absolute inset-x-0 bottom-0 z-10 bg-leaf/90 py-px text-center text-[7px] font-bold uppercase tracking-wider text-white">After plan</span>}
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="" className={`h-full w-full object-cover ${after ? "" : "grayscale-[35%]"}`} style={mirrored ? { transform: "scaleX(-1)" } : undefined} />
              ) : (
                <svg viewBox="0 0 68 86" className="h-full w-full text-ink-soft/40" aria-hidden>
                  <circle cx="34" cy="34" r="15" fill="currentColor" />
                  <path d="M8 86c2-18 13-26 26-26s24 8 26 26z" fill="currentColor" />
                </svg>
              )}
            </div>
            <dl className="w-[42%] min-w-0 space-y-0.5 text-[10px] leading-tight">
              <div>
                <dt className="uppercase tracking-wider text-ink-soft">Destination</dt>
                <dd className="truncate text-[12px] font-semibold">{destination}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-wider text-ink-soft">Dates</dt>
                <dd className="font-semibold">{dates}</dd>
              </div>
              {skinType && (
                <div>
                  <dt className="uppercase tracking-wider text-ink-soft">Skin type</dt>
                  <dd className="truncate font-semibold">{skinType}</dd>
                </div>
              )}
              <div>
                <dt className="uppercase tracking-wider text-ink-soft">Must-packs</dt>
                <dd className="font-semibold tabular-nums">
                  {covered} / {must} covered
                </dd>
              </div>
            </dl>
          </div>
          <p className="relative mt-2.5 truncate font-sans font-semibold text-[9px] tracking-[0.12em] text-ink-soft/70">{mrz}</p>

          {/* The stamp */}
          <div
            className="pointer-events-none absolute left-[76%] top-[58%] rounded-xl border-[3px] px-2.5 py-1 text-center mix-blend-multiply"
            style={{ borderColor: ink, color: ink, outline: `1.5px solid ${ink}`, outlineOffset: "3px", animation: "stampIn .55s cubic-bezier(.2,.8,.3,1.2) .25s both", opacity: 0.88 }}
          >
            <p className="text-[7px] font-bold uppercase tracking-[0.25em]">SkinPassport</p>
            <p className="whitespace-nowrap font-display text-[15px] font-bold uppercase leading-[1.05] tracking-wide">{protectedAll ? <>Well<br />protected</> : <>Scan<br />passed</>}</p>
            <p className="text-[7px] font-bold uppercase tracking-[0.2em]">{protectedAll ? "Cleared for travel" : "Pack list pending"}</p>
          </div>
        </div>
      </div>
      {!protectedAll && !compact && (
        <p className="mt-4 text-center text-[11px] text-ink-soft">
          Add <b className="text-ink">{missing.map((n) => n.title.toLowerCase()).join(", ")}</b> to be fully protected.
        </p>
      )}
    </div>
  );
}

function StepTile({ step, n }: { step: DuringStep; n?: number }) {
  const app = useApp();
  const product: Product | null = step.item?.productId ? (allProducts(app).find((p) => p.id === step.item!.productId) ?? null) : null;
  return (
    <li className="flex min-w-0 flex-col items-center text-center">
      <div className="relative">
        {product ? (
          <ProductShot product={product} size={60} />
        ) : (
          <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[22%] bg-paper text-2xl" aria-hidden>
            {step.icon}
          </div>
        )}
        {n != null && <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-paper">{n}</span>}
        {product && <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] shadow" aria-hidden>{step.icon}</span>}
      </div>
      <p className="mt-1.5 text-[11px] font-medium leading-tight">
        <Rich text={step.text} />
      </p>
      {step.item && <p className="mt-0.5 line-clamp-2 text-[9px] leading-tight text-ink-soft">{step.item.name}</p>}
    </li>
  );
}

function DuringCard({ group }: { group: DuringGroup }) {
  const routine = group.id === "am" || group.id === "pm";
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold">
        <span aria-hidden>{group.icon}</span>
        {group.title}
      </p>
      {group.id === "tips" ? (
        <ul className="space-y-1.5">
          {group.steps.map((s) => (
            <li key={s.text} className="flex items-center gap-2 text-[12px] leading-snug">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-sm" aria-hidden>
                {s.icon}
              </span>
              <span>
                <Rich text={s.text} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <ol className="grid grid-cols-3 gap-x-2 gap-y-3">
          {group.steps.map((s, i) => (
            <StepTile key={s.text + i} step={s} n={routine ? i + 1 : undefined} />
          ))}
        </ol>
      )}
    </div>
  );
}

export default function ActionPlanView() {
  const app = useApp();
  const today = useToday();

  if (!today) return null; // client-only (dates and saved state)

  const { plan, climate, skin, trip } = app;
  if (!plan || !climate || !skin || !trip.startDate) {
    return (
      <main className="with-nav mx-auto max-w-md px-4 py-16 text-center">
        <p className="font-display text-2xl">No plan yet</p>
        <p className="mt-2 text-sm text-ink-soft">Plan your trip and scan your skin first.</p>
        <Link href="/trip" className="mt-6 inline-block rounded-xl bg-coral px-5 py-3 text-sm font-bold text-white">
          Start
        </Link>
      </main>
    );
  }

  return <PlanBody />;
}

function PlanBody() {
  const app = useApp();
  usePassportAutosave(app);
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState<"idle" | "busy" | "done" | "error">("idle");
  const plan = app.plan!;
  const climate = app.climate!;
  const trip = app.trip;

  const daysUntil = Math.max(0, daysFromToday(trip.startDate));
  const bag = bagProducts(app);
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
    skinType: app.skin?.skinType ?? null,
  });

  // Protection status: every must-pack is in the bag or at home.
  const homeNeeds = new Set<NeedId>([...app.ownedNeeds, ...shelfNeeds]);
  const mustNeeds = plan.needs.filter((n) => n.tier === "must");
  const missing = mustNeeds.filter((n) => !homeNeeds.has(n.id) && !bag.some((p) => p.needs.includes(n.id)));

  // YouCam AI Skin Simulation of the concerns these products address.
  const covered = new Set<NeedId>([...homeNeeds, ...bag.flatMap((p) => p.needs)]);
  const simPlan = simulationPlan(plan.report, covered, daysUntil);
  const photoId = app.photo ? `${app.photo.length}:${app.photo.slice(-24)}` : "none";
  const sim = useSkinSimulation(app.photo, simPlan, simKey(photoId, simPlan.intensities));

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
    <main className="with-nav mx-auto max-w-md px-4 pb-16 pt-4 lg:max-w-lg lg:pt-10">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/trip" className="text-sm font-semibold text-ink-soft hover:text-ink">
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
            {plan.report.filter((r) => CORE.includes(r.key)).map((r) => (
              <span key={r.key} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${BAND_DOT[bandFor(r.score)]}`} />
                {r.label.split(" (")[0]} {r.score}
              </span>
            ))}
          </div>
        </div>

        <div className="px-5 py-5">
          <PassportStamp
            photo={sim.ready?.image ?? app.photo}
            after={!!sim.ready && !sim.ready.mock}
            skinType={app.skin?.skinType?.whole ?? null}
            mirrored={app.photoMirrored}
            destination={trip.destination?.name ?? "Your trip"}
            dates={`${fmt(trip.startDate)} – ${fmt(trip.startDate, trip.days - 1)}`}
            covered={mustNeeds.length - missing.length}
            must={mustNeeds.length}
            missing={missing}
          />
          <SkinSimulation photo={app.photo} mirrored={app.photoMirrored} plan={simPlan} sim={sim} />

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
              <DuringCard key={g.id} group={g} />
            ))}
          </div>

          <p className="mt-5 text-center text-[9px] text-ink-soft">
            Skin scores by YouCam AI · {climate.basis === "typical" ? "Typical weather for these dates" : climate.source === "demo" ? "Demo climate" : "Weather forecast"} · Not medical advice
          </p>
        </div>
      </div>

      {app.currentPassportId && (
        <Link href="/profile" className="mt-6 block rounded-xl border border-ink bg-white py-3 text-center text-sm font-bold hover:bg-paper">
          ‹ Back to My Passports
        </Link>
      )}
    </main>
  );
}
