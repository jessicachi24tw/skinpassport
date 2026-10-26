"use client";

import { useEffect, useRef, useState } from "react";
import Bag from "@/components/Bag";
import Results from "@/components/Results";
import SkinStep from "@/components/SkinStep";
import TripStep, { localToday, useToday } from "@/components/TripStep";
import { ErrorText } from "@/components/ui";
import { DEMO_ORIGIN, DEMO_ORIGIN_CLIMATE, getScenario } from "@/lib/engine/scenarios";
import { setApp, useApp } from "@/lib/store";
import type { Climate, Place, PlanResult, SkinProfile, TripInput } from "@/lib/types";

const addDays = (from: string, n: number) => {
  const d = new Date(`${from}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const daysUntil = (date: string) => Math.max(0, Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${localToday()}T12:00:00`).getTime()) / 86400000));

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data as T;
}

const coords = (p: Place) => ({ name: p.name, lat: p.lat, lon: p.lon });

/** Current climate at home; null if the forecast service is unreachable. */
async function homeClimate(origin: Place): Promise<Climate | null> {
  try {
    return (await postJson<{ climate: Climate }>("/api/weather", { place: coords(origin), now: true })).climate;
  } catch {
    return null;
  }
}

type Health = { youcam: string; weather: string; llm: string; shop: string };

export default function Home() {
  const app = useApp();
  const today = useToday();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Default the trip to one week from today until the user picks a date.
  const trip: TripInput = app.trip.startDate || !today ? app.trip : { ...app.trip, startDate: addDays(today, 7) };
  const setTrip = (patch: Partial<TripInput>) => setApp((s) => ({ trip: { ...s.trip, startDate: s.trip.startDate || trip.startDate, ...patch }, scenarioId: null }));

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  async function makePlan(climate: Climate, origin: Climate | null, t: TripInput) {
    if (!app.skin) return;
    const plan = await postJson<PlanResult>("/api/plan", {
      skin: app.skin.scores,
      climate,
      origin,
      trip: { activities: t.activities, transport: t.transport, days: t.days, notes: t.notes },
      daysUntilTrip: daysUntil(t.startDate),
    });
    setApp({ climate, originClimate: origin, plan });
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }

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

  const planLive = () =>
    run(async () => {
      const dest = trip.destination!;
      const [destRes, origin] = await Promise.all([
        postJson<{ climate: Climate }>("/api/weather", { place: coords(dest), startDate: trip.startDate, days: trip.days }),
        homeClimate(trip.origin!),
      ]);
      setApp({ scenarioId: null, trip });
      await makePlan(destRes.climate, origin, trip);
    });

  const planScenario = (id: string) =>
    run(async () => {
      const s = getScenario(id)!;
      const originPlace = trip.origin ?? DEMO_ORIGIN;
      const t: TripInput = {
        ...trip,
        origin: originPlace,
        destination: s.place,
        days: s.days,
        activities: s.activities,
        notes: trip.notes,
        transport: trip.transport.length ? trip.transport : ["plane"],
      };
      setApp({ trip: t, scenarioId: id });
      const { climate } = await postJson<{ climate: Climate }>("/api/weather", { scenarioId: id });
      const origin = originPlace.id === DEMO_ORIGIN.id ? DEMO_ORIGIN_CLIMATE : await homeClimate(originPlace);
      await makePlan(climate, origin, t);
    });

  // A new scan invalidates the old plan.
  const onSkin = (skin: SkinProfile) => setApp({ skin, plan: null });

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">Geo-adaptive skincare coach</p>
          <h1 className="font-display text-4xl leading-none">SkinPassport</h1>
          <p className="mt-2 text-sm text-ink-soft">Your skin today + your destination&apos;s climate = the right travel kit.</p>
        </div>
        <span className="stamp mb-1 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-sea">Cleared for travel</span>
      </header>

      {health && (
        <p className="mb-4 text-[11px] text-ink-soft">
          Skin AI: <b>{health.youcam === "live" ? "YouCam live" : "demo mode"}</b> · Weather: <b>{health.weather}</b> · Coach: <b>{health.llm}</b>
        </p>
      )}

      <div className="space-y-4">
        <SkinStep skin={app.skin} onSkin={onSkin} />
        <TripStep trip={trip} setTrip={setTrip} disabled={!app.skin} busy={busy} onPlan={planLive} onScenario={planScenario} activeScenario={app.scenarioId} />
        <ErrorText>{error}</ErrorText>
        <div id="plan" ref={resultsRef} className="scroll-mt-4">
          {app.plan && app.climate && <Results plan={app.plan} climate={app.climate} origin={app.originClimate} />}
        </div>
      </div>

      <footer className="mt-10 text-center text-[11px] text-ink-soft">Not medical advice. Skin analysis powered by YouCam AI Skin Analysis API.</footer>
      <Bag />
    </main>
  );
}
