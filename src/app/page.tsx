"use client";

import { useEffect, useRef, useState } from "react";
import Results from "@/components/Results";
import SkinStep from "@/components/SkinStep";
import TripStep, { localToday, useToday } from "@/components/TripStep";
import { ErrorText } from "@/components/ui";
import { getScenario } from "@/lib/engine/scenarios";
import type { Climate, PlanResult, SkinProfile, TripInput } from "@/lib/types";

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

type Health = { youcam: string; weather: string; llm: string; shop: string };

export default function Home() {
  const [skin, setSkin] = useState<SkinProfile | null>(null);
  const today = useToday();
  const [tripState, setTrip] = useState<TripInput>({ destination: "", startDate: "", days: 4, activity: "city", flight: true });
  const [climate, setClimate] = useState<Climate | null>(null);
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [scenario, setScenario] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState<Health | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Default the trip to one week from today until the user picks a date.
  const trip = tripState.startDate || !today ? tripState : { ...tripState, startDate: addDays(today, 7) };

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  async function makePlan(c: Climate, t: TripInput) {
    if (!skin) return;
    const p = await postJson<PlanResult>("/api/plan", { skin: skin.scores, climate: c, trip: t, daysUntilTrip: daysUntil(t.startDate) });
    setClimate(c);
    setPlan(p);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
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
      setScenario(null);
      const { climate: c } = await postJson<{ climate: Climate }>("/api/weather", { destination: trip.destination, startDate: trip.startDate, days: trip.days });
      await makePlan(c, trip);
    });

  const planScenario = (id: string) =>
    run(async () => {
      const s = getScenario(id)!;
      const t: TripInput = { ...trip, destination: s.destination, activity: s.activity, days: s.days, flight: true };
      setTrip(t);
      setScenario(id);
      const { climate: c } = await postJson<{ climate: Climate }>("/api/weather", { scenarioId: id });
      await makePlan(c, t);
    });

  // A new scan invalidates the old plan.
  const onSkin = (s: SkinProfile) => {
    setSkin(s);
    setPlan(null);
  };

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
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
        <SkinStep skin={skin} onSkin={onSkin} />
        <TripStep trip={trip} setTrip={setTrip} disabled={!skin} busy={busy} onPlan={planLive} onScenario={planScenario} activeScenario={scenario} />
        <ErrorText>{error}</ErrorText>
        <div ref={resultsRef} className="scroll-mt-4">
          {plan && climate && <Results plan={plan} climate={climate} />}
        </div>
      </div>

      <footer className="mt-10 text-center text-[11px] text-ink-soft">Not medical advice. Skin analysis powered by YouCam AI Skin Analysis API.</footer>
    </main>
  );
}
