"use client";

import { useEffect, useRef, useState } from "react";
import Bag from "@/components/Bag";
import Results from "@/components/Results";
import ShelfStep from "@/components/ShelfStep";
import SkinStep from "@/components/SkinStep";
import TripStep, { addDaysIso, daysFromToday, useToday } from "@/components/TripStep";
import { ErrorText } from "@/components/ui";
import { bandFor } from "@/lib/engine/report";
import { DEMO_ORIGIN, DEMO_ORIGIN_CLIMATE, getScenario } from "@/lib/engine/scenarios";
import { resetAll, setApp, useApp, type Step } from "@/lib/store";
import type { Climate, Place, PlanResult, SkinProfile, TripInput } from "@/lib/types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data as T;
}

const coords = (p: Place) => ({ name: p.name, lat: p.lat, lon: p.lon });

/** Current climate at home; null if the forecast service is unreachable. */
async function homeClimate(origin: Place): Promise<Climate | null> {
  if (origin.id === DEMO_ORIGIN.id) return DEMO_ORIGIN_CLIMATE;
  try {
    return (await postJson<{ climate: Climate }>("/api/weather", { place: coords(origin), now: true })).climate;
  } catch {
    return null;
  }
}

const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Collapsed view of a finished step. */
function Done({ n, title, children, onEdit, edit = "Edit" }: { n: number; title: string; children: React.ReactNode; onEdit: () => void; edit?: string }) {
  return (
    <section className="flex items-start gap-3 rounded-2xl border border-line bg-white/70 px-4 py-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sea text-xs font-bold text-white">✓</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
          {n}. {title}
        </p>
        <div className="truncate text-sm">{children}</div>
      </div>
      <button onClick={onEdit} className="shrink-0 text-xs font-semibold text-coral hover:underline">
        {edit}
      </button>
    </section>
  );
}

const ORDER: Step[] = ["trip", "scan", "shelf", "results"];

type Health = { youcam: string; weather: string; llm: string; shop: string };

export default function Home() {
  const app = useApp();
  const today = useToday();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Default the trip to one week from today until the user picks a date.
  const trip: TripInput = app.trip.startDate || !today ? app.trip : { ...app.trip, startDate: addDaysIso(today, 7) };
  const setTrip = (patch: Partial<TripInput>) => setApp((s) => ({ trip: { ...s.trip, startDate: s.trip.startDate || trip.startDate, ...patch }, scenarioId: null, plan: null }));
  const daysUntil = trip.startDate && today ? Math.max(0, daysFromToday(trip.startDate)) : undefined;
  const stepIndex = ORDER.indexOf(app.step);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const go = (step: Step) => {
    setApp({ step });
    setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Step 1 → live weather for the trip window + current weather at home.
  const tripNext = () =>
    run(async () => {
      const [dest, origin] = await Promise.all([
        postJson<{ climate: Climate }>("/api/weather", { place: coords(trip.destination!), startDate: trip.startDate, days: trip.days }),
        homeClimate(trip.origin!),
      ]);
      setApp({ trip, climate: dest.climate, originClimate: origin, scenarioId: null, plan: null });
      go(app.skin ? "shelf" : "scan");
    });

  const pickScenario = (id: string) =>
    run(async () => {
      const s = getScenario(id)!;
      const originPlace = trip.origin ?? DEMO_ORIGIN;
      const t: TripInput = { ...trip, origin: originPlace, destination: s.place, days: s.days, activities: s.activities, transport: trip.transport.length ? trip.transport : ["plane"] };
      const origin = await homeClimate(originPlace);
      setApp({ trip: t, scenarioId: id, climate: s.climate, originClimate: origin, plan: null });
      go(app.skin ? "shelf" : "scan");
    });

  const onSkin = (skin: SkinProfile) => setApp({ skin, plan: null });

  // Step 3 → plan.
  const buildPlan = () =>
    run(async () => {
      const plan = await postJson<PlanResult>("/api/plan", {
        skin: app.skin!.scores,
        climate: app.climate,
        origin: app.originClimate,
        trip: { activities: trip.activities, transport: trip.transport, days: trip.days, notes: trip.notes, daysUntil },
        owned: app.shelf,
      });
      setApp({ plan });
      go("results");
    });

  const weakest = app.skin
    ? (["moisture", "oiliness", "redness", "age_spot"] as const)
        .map((k) => ({ k, v: app.skin!.scores[k] }))
        .sort((a, b) => a.v - b.v)
        .slice(0, 2)
    : [];
  const NAMES = { moisture: "Moisture", oiliness: "Oil", redness: "Redness", age_spot: "Spots" } as const;

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Geo-adaptive skincare coach</p>
          <h1 className="font-display text-4xl leading-none">SkinPassport</h1>
          <p className="mt-2 text-sm text-ink-soft">Your trip + your skin today = the right travel kit.</p>
        </div>
        <span className="stamp mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-sea">Cleared for travel</span>
      </header>

      {/* Progress */}
      <ol className="mb-4 grid grid-cols-4 gap-1.5" aria-label="Progress">
        {["Trip", "Scan", "Shelf", "Plan"].map((label, i) => (
          <li key={label} className="text-center">
            <div className={`h-1.5 rounded-full ${i <= stepIndex ? "bg-coral" : "bg-line"}`} />
            <p className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${i === stepIndex ? "text-ink" : "text-ink-soft"}`}>{label}</p>
          </li>
        ))}
      </ol>

      {health && (
        <p className="mb-4 text-[11px] text-ink-soft">
          Skin AI: <b>{health.youcam === "live" ? "YouCam live" : "demo mode"}</b> · Weather: <b>{health.weather}</b> · Coach: <b>{health.llm}</b>
        </p>
      )}

      <div ref={topRef} className="scroll-mt-4 space-y-3">
        {app.step === "trip" ? (
          <TripStep trip={trip} setTrip={setTrip} disabled={false} busy={busy} onPlan={tripNext} onScenario={pickScenario} activeScenario={app.scenarioId} />
        ) : (
          <Done n={1} title="Trip" onEdit={() => go("trip")}>
            <b>{trip.origin?.name ?? "Home"}</b> → <b>{trip.destination?.name}</b> · {trip.startDate ? `${fmt(trip.startDate)} · ` : ""}
            {trip.days} days{daysUntil != null ? ` · in ${daysUntil} days` : ""}
          </Done>
        )}

        {app.step === "scan" && <SkinStep onSkin={onSkin} onNext={() => go("shelf")} />}
        {stepIndex > 1 && app.skin && (
          <Done n={2} title="Skin scan" onEdit={() => go("scan")} edit="Re-scan">
            {weakest.map((w, i) => (
              <span key={w.k}>
                {i > 0 && " · "}
                {NAMES[w.k]} <b>{w.v}</b> ({bandFor(w.v)})
              </span>
            ))}
          </Done>
        )}

        {app.step === "shelf" && <ShelfStep busy={busy} onDone={buildPlan} />}
        {stepIndex > 2 && (
          <Done n={3} title="My shelf" onEdit={() => go("shelf")}>
            {app.shelf.length ? `${app.shelf.length} product${app.shelf.length === 1 ? "" : "s"}: ${app.shelf.map((p) => p.name).join(", ")}` : "Skipped"}
          </Done>
        )}

        <ErrorText>{error}</ErrorText>

        {app.step === "results" && app.plan && app.climate && (
          <Results plan={app.plan} climate={app.climate} origin={app.originClimate} trip={{ activities: trip.activities, transport: trip.transport, days: trip.days, daysUntil }} />
        )}
      </div>

      <footer className="mt-10 text-center text-[11px] text-ink-soft">
        <button onClick={() => (resetAll(), window.scrollTo({ top: 0 }))} className="mb-2 underline">
          Start over
        </button>
        <p>Not medical advice. Skin analysis powered by YouCam AI Skin Analysis API.</p>
      </footer>
      {app.step !== "results" && <Bag />}
    </main>
  );
}
