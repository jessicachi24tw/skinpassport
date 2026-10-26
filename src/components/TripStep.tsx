"use client";

import { useState, useSyncExternalStore } from "react";
import { SCENARIOS } from "@/lib/engine/scenarios";
import type { Activity, TripInput } from "@/lib/types";
import { Button, Card, ErrorText, StepTitle } from "./ui";

const ACTIVITIES: { id: Activity; label: string }[] = [
  { id: "city", label: "City" },
  { id: "beach", label: "Beach" },
  { id: "ski", label: "Ski" },
  { id: "outdoor", label: "Outdoor / festival" },
  { id: "business", label: "Business" },
];

export const localToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const noopSubscribe = () => () => {};
/** Today's date on the client, "" during server prerender (avoids a stale build-time date). */
export const useToday = () => useSyncExternalStore(noopSubscribe, localToday, () => "");

export default function TripStep({
  trip,
  setTrip,
  disabled,
  busy,
  onPlan,
  onScenario,
  activeScenario,
}: {
  trip: TripInput;
  setTrip: (t: TripInput) => void;
  disabled: boolean;
  busy: boolean;
  onPlan: () => void;
  onScenario: (id: string) => void;
  activeScenario: string | null;
}) {
  const today = useToday();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");

  async function parse() {
    if (!text.trim()) {
      setError("Describe your trip first, e.g. “Ski trip to Hokkaido next week for 4 days”.");
      return;
    }
    setError("");
    setParsing(true);
    try {
      const res = await fetch("/api/trip/parse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, today: today || localToday() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTrip({ ...trip, ...data.trip });
    } catch (e) {
      setError((e as Error).message || "Could not read that trip.");
    } finally {
      setParsing(false);
    }
  }

  function submit() {
    if (!trip.destination.trim()) return setError("Add a destination.");
    if (!trip.startDate) return setError("Pick a start date.");
    setError("");
    onPlan();
  }

  const field = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink";

  return (
    <Card className={disabled ? "opacity-60" : ""}>
      <StepTitle n={2} title="Where are you going?" hint={disabled ? "Scan your skin first." : "Type it naturally, or fill in the details."} />

      <div className="flex gap-2">
        <input
          className={field}
          placeholder="Ski trip to Hokkaido next week for 4 days"
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && parse()}
        />
        <Button variant="ghost" onClick={parse} disabled={disabled || parsing}>
          {parsing ? "…" : "Fill in"}
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="col-span-2 text-xs text-ink-soft">
          Destination
          <input className={`${field} mt-1`} value={trip.destination} disabled={disabled} onChange={(e) => setTrip({ ...trip, destination: e.target.value })} placeholder="Sapporo, Japan" />
        </label>
        <label className="text-xs text-ink-soft">
          Start date
          <input type="date" className={`${field} mt-1`} min={today || undefined} value={trip.startDate} disabled={disabled} onChange={(e) => setTrip({ ...trip, startDate: e.target.value })} />
        </label>
        <label className="text-xs text-ink-soft">
          Days
          <input type="number" min={1} max={14} className={`${field} mt-1`} value={trip.days} disabled={disabled} onChange={(e) => setTrip({ ...trip, days: Math.min(14, Math.max(1, Number(e.target.value) || 1)) })} />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {ACTIVITIES.map((a) => (
          <button
            key={a.id}
            disabled={disabled}
            onClick={() => setTrip({ ...trip, activity: a.id })}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${trip.activity === a.id ? "border-ink bg-ink text-paper" : "border-line bg-white"}`}
          >
            {a.label}
          </button>
        ))}
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={trip.flight} disabled={disabled} onChange={(e) => setTrip({ ...trip, flight: e.target.checked })} className="h-4 w-4 accent-ink" />
        I&apos;m flying there
      </label>

      <Button onClick={submit} disabled={disabled || busy} className="mt-4 w-full" variant="coral">
        {busy ? "Building your plan…" : "Build my travel skin plan"}
      </Button>
      <ErrorText>{error}</ErrorText>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Or try a demo destination</p>
        <div className="grid grid-cols-3 gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              disabled={disabled || busy}
              onClick={() => onScenario(s.id)}
              className={`rounded-xl border px-2 py-2.5 text-center text-xs font-medium leading-tight transition ${activeScenario === s.id ? "border-coral bg-coral-soft text-coral" : "border-line bg-white hover:bg-paper"}`}
            >
              <span className="block text-lg">{s.emoji}</span>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  );
}
