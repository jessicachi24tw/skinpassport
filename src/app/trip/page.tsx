"use client";

import { useState } from "react";
import Bag from "@/components/Bag";
import Results from "@/components/Results";
import ShelfStep from "@/components/ShelfStep";
import SkinStep from "@/components/SkinStep";
import TripStep, { addDaysIso, daysFromToday, useToday } from "@/components/TripStep";
import { ErrorText } from "@/components/ui";
import { DEMO_ORIGIN, DEMO_ORIGIN_CLIMATE } from "@/lib/engine/scenarios";
import { savePlan, usePassportAutosave } from "@/lib/passports";
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

const ORDER: Step[] = ["trip", "scan", "shelf", "results"];
const LABELS = ["Set your trip", "Scan your skin", "Add your shelf", "Get your plan"];

export default function Home() {
  const app = useApp();
  const today = useToday();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  usePassportAutosave(app);

  // Default the trip to one week from today until the user picks a date.
  const trip: TripInput = app.trip.startDate || !today ? app.trip : { ...app.trip, startDate: addDaysIso(today, 7) };
  const setTrip = (patch: Partial<TripInput>) => setApp((s) => ({ trip: { ...s.trip, startDate: s.trip.startDate || trip.startDate, ...patch }, scenarioId: null, climate: null, plan: null }));
  const daysUntil = trip.startDate && today ? Math.max(0, daysFromToday(trip.startDate)) : undefined;

  // Any step you've reached stays reachable, even after the plan is built.
  // Changing the trip or rescanning clears the plan; "See my plan" rebuilds it into the same passport.
  const hasPlan = !!app.plan;
  const step: Step = app.step === "results" && !hasPlan ? "shelf" : app.step;
  const stepIndex = ORDER.indexOf(step);
  const reachable = (s: Step) =>
    s === "trip" || (s === "scan" && !!app.climate) || (s === "shelf" && !!app.climate && !!app.skin) || (s === "results" && hasPlan && !!app.climate);

  const go = (next: Step) => {
    setError("");
    setApp({ step: next });
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Step 1 → weather for the trip window + current weather at home.
  const tripNext = () =>
    run(async () => {
      const [dest, origin] = await Promise.all([
        postJson<{ climate: Climate }>("/api/weather", { place: coords(trip.destination!), startDate: trip.startDate, days: trip.days }),
        homeClimate(trip.origin!),
      ]);
      setApp({ trip, climate: dest.climate, originClimate: origin, scenarioId: null, plan: null });
      go("scan");
    });

  const onSkin = (skin: SkinProfile) => setApp({ skin, plan: null });

  // Step 3 → plan.
  const buildPlan = () =>
    run(async () => {
      const plan = await postJson<PlanResult>("/api/plan", {
        skin: app.skin!.scores,
        skinType: app.skin!.skinType ?? null,
        climate: app.climate,
        origin: app.originClimate,
        trip: { activities: trip.activities, transport: trip.transport, days: trip.days, notes: trip.notes, daysUntil },
        owned: app.shelf,
      });
      setApp({ plan, step: "results" });
      window.scrollTo({ top: 0 });
      // Save it to My SkinPassports (on this device): a new passport, or the one being edited.
      const id = await savePlan({ ...app, trip, plan, step: "results" });
      if (id) setApp({ currentPassportId: id });
    });

  const prev = stepIndex > 0 ? ORDER[stepIndex - 1] : null;
  const next = stepIndex < 3 && reachable(ORDER[stepIndex + 1]) ? ORDER[stepIndex + 1] : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-28 pt-6 lg:max-w-2xl lg:pt-10">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-display text-4xl leading-none">SkinPassport</h1>
          <p className="mt-2 text-sm text-ink-soft">Your trip + your skin today = the right travel kit.</p>
        </div>
        <span className="stamp mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-sea">Cleared for travel</span>
      </header>

      {/* Progress: tap any step you've reached to jump back (or forward) to it. */}
      <ol className="mb-4 grid grid-cols-4 gap-1.5" aria-label="Progress">
        {LABELS.map((label, i) => {
          const s = ORDER[i];
          const canGo = s !== step && reachable(s);
          return (
            <li key={label}>
              <button
                type="button"
                disabled={!canGo}
                onClick={() => go(s)}
                aria-current={s === step ? "step" : undefined}
                className="group w-full text-left disabled:cursor-default"
              >
                <div className={`h-1.5 rounded-full transition-colors ${i <= stepIndex ? "bg-coral" : "bg-line"} ${canGo ? "group-hover:bg-coral/60" : ""}`} />
                <p className={`mt-1.5 text-[11px] font-semibold leading-tight ${s === step ? "text-ink" : canGo ? "text-ink-soft underline-offset-2 group-hover:underline" : "text-ink-soft/70"}`}>
                  <span className="tabular-nums">{i + 1}.</span> {label}
                </p>
              </button>
            </li>
          );
        })}
      </ol>

      <div key={step} className="page-in flex-1">
        {step === "trip" && <TripStep trip={trip} setTrip={setTrip} disabled={false} busy={busy} onPlan={tripNext} />}
        {step === "scan" && <SkinStep onSkin={onSkin} onNext={() => go("shelf")} />}
        {step === "shelf" && <ShelfStep busy={busy} onDone={buildPlan} />}
        {step === "results" && app.plan && app.climate && (
          <Results plan={app.plan} climate={app.climate} origin={app.originClimate} trip={{ activities: trip.activities, transport: trip.transport, days: trip.days, daysUntil }} />
        )}
        <ErrorText>{error}</ErrorText>
      </div>

      {(prev || next) && (
        <nav className="mt-4 flex items-center justify-between text-sm font-semibold" aria-label="Step navigation">
          {prev ? (
            <button onClick={() => go(prev)} className="rounded-xl px-2 py-2 text-ink-soft hover:text-ink">
              ‹ Back: {LABELS[ORDER.indexOf(prev)]}
            </button>
          ) : (
            <span />
          )}
          {next && (
            <button onClick={() => go(next)} className="rounded-xl px-2 py-2 text-ink-soft hover:text-ink">
              {LABELS[ORDER.indexOf(next)]} ›
            </button>
          )}
        </nav>
      )}

      <footer className="mt-10 text-center text-[11px] text-ink-soft">
        {hasPlan && app.currentPassportId && <p className="mb-2 text-sea">✓ Saved to My Passports on this device</p>}
        <button onClick={() => (resetAll(), window.scrollTo({ top: 0 }))} className="mb-2 underline">
          {hasPlan ? "Plan a new trip" : "Start over"}
        </button>
        <p>Not medical advice. Skin analysis powered by YouCam AI Skin Analysis API.</p>
      </footer>
      {step !== "results" && <Bag />}
    </main>
  );
}
