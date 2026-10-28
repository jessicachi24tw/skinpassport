"use client";

import { useState, useSyncExternalStore } from "react";
import { CITIES } from "@/lib/places";
import { SCENARIOS } from "@/lib/engine/scenarios";
import type { Activity, Place, Transport, TripInput } from "@/lib/types";
import LocationPicker from "./LocationPicker";
import TripMap from "./TripMap";
import { Button, Card, ErrorText, StepTitle } from "./ui";

export const localToday = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const addDaysIso = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Whole days from today to a date (local time). */
export const daysFromToday = (iso: string) =>
  Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date(`${localToday()}T12:00:00`).getTime()) / 86400000);

const noopSubscribe = () => () => {};
/** Today's date on the client, "" during server prerender (avoids a stale build-time date). */
export const useToday = () => useSyncExternalStore(noopSubscribe, localToday, () => "");

const TRANSPORT: { id: Transport; label: string; icon: string }[] = [
  { id: "plane", label: "Plane", icon: "✈️" },
  { id: "train", label: "Train", icon: "🚄" },
  { id: "car", label: "Car", icon: "🚗" },
  { id: "bus", label: "Bus", icon: "🚌" },
  { id: "subway", label: "Subway", icon: "🚇" },
  { id: "ship", label: "Ship", icon: "🛳️" },
];

export const ACTIVITY_TAGS: { id: Activity; label: string; icon: string }[] = [
  { id: "city", label: "City sightseeing", icon: "🏙️" },
  { id: "beach", label: "Beach day", icon: "🏖️" },
  { id: "pool", label: "Swimming / pool", icon: "🏊" },
  { id: "ski", label: "Skiing / snow", icon: "🎿" },
  { id: "hiking", label: "Hiking", icon: "🥾" },
  { id: "festival", label: "Outdoor festival", icon: "🎪" },
  { id: "business", label: "Business meetings", icon: "💼" },
  { id: "nightlife", label: "Nights out", icon: "🌙" },
];

/** Add or remove a tag's phrase in the notes text, keeping the user's own words. */
function toggleNote(notes: string, phrase: string, on: boolean) {
  const parts = notes
    .split(/,\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const without = parts.filter((p) => p.toLowerCase() !== phrase.toLowerCase());
  return (on ? [...without, phrase] : without).join(", ");
}

const fmt = (iso: string, add = 0) => {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + add);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

/** Nearest known city within ~60 km of the device location. */
function nearestCity(lat: number, lon: number): Place {
  let best: Place | null = null;
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = Math.hypot(c.lat - lat, (c.lon - lon) * Math.cos((lat * Math.PI) / 180));
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  if (best && bestD < 0.55) return best;
  return { id: `geo-${lat.toFixed(2)},${lon.toFixed(2)}`, name: "My location", country: "", countryCode: "", lat, lon };
}

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{title}</h3>
        {hint && <span className="text-[11px] text-ink-soft">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Chip({ on, onClick, disabled, children }: { on: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
        on ? "border-ink bg-ink text-paper shadow-sm" : "border-line bg-white hover:border-ink/40"
      }`}
    >
      {children}
      {on && <span aria-hidden>✓</span>}
    </button>
  );
}

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
  setTrip: (patch: Partial<TripInput>) => void;
  disabled: boolean;
  busy: boolean;
  onPlan: () => void;
  onScenario: (id: string) => void;
  activeScenario: string | null;
}) {
  const today = useToday();
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  function useMyLocation() {
    if (!navigator.geolocation) return setError("Location isn't available in this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setTrip({ origin: nearestCity(pos.coords.latitude, pos.coords.longitude) });
      },
      () => {
        setLocating(false);
        setError("Couldn't get your location. Type your city instead.");
      },
      { timeout: 8000 },
    );
  }

  function toggleTransport(id: Transport) {
    const on = !trip.transport.includes(id);
    setTrip({ transport: on ? [...trip.transport, id] : trip.transport.filter((t) => t !== id) });
  }

  function toggleActivity(tag: (typeof ACTIVITY_TAGS)[number]) {
    const on = !trip.activities.includes(tag.id);
    setTrip({
      activities: on ? [...trip.activities, tag.id] : trip.activities.filter((a) => a !== tag.id),
      notes: toggleNote(trip.notes, tag.label, on),
    });
  }

  function submit() {
    if (!trip.origin) return setError("Add where you're leaving from.");
    if (!trip.destination) return setError("Add your destination.");
    if (!trip.startDate) return setError("Pick a start date.");
    setError("");
    onPlan();
  }

  const placesDone = !!(trip.origin && trip.destination);

  return (
    <Card className={disabled ? "opacity-60" : ""}>
      <StepTitle n={1} title="Where are you going?" hint="Route first, then dates, transport and activities." />

      <div className="space-y-4">
        <Section title="Route">
          <div className="space-y-2">
            <LocationPicker
              label="From"
              value={trip.origin}
              onChange={(origin) => setTrip({ origin })}
              disabled={disabled}
              extra={
                <button onClick={useMyLocation} disabled={disabled || locating} className="text-[11px] font-semibold text-sea hover:underline disabled:opacity-50">
                  {locating ? "Locating…" : "📍 Use my location"}
                </button>
              }
            />
            <div className="flex justify-center">
              <button
                onClick={() => setTrip({ origin: trip.destination, destination: trip.origin })}
                disabled={disabled || (!trip.origin && !trip.destination)}
                aria-label="Swap from and to"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-white text-sm transition hover:rotate-180 disabled:opacity-40"
              >
                ⇅
              </button>
            </div>
            <LocationPicker label="To" value={trip.destination} onChange={(destination) => setTrip({ destination })} disabled={disabled} />
          </div>
          <div className="mt-3">
            <TripMap origin={trip.origin} destination={trip.destination} transport={trip.transport} />
          </div>
        </Section>

        <Section title="Dates" hint={trip.startDate ? `${fmt(trip.startDate)} → ${fmt(trip.startDate, trip.days - 1)}` : undefined}>
          {trip.startDate && today && (
            <p className="mb-2 text-[11px] text-ink-soft">
              {daysFromToday(trip.startDate) + trip.days > 16 ? (
                <>
                  More than 16 days out — we&apos;ll use <b>last year&apos;s weather for these dates</b> (“Typical for these dates”).
                </>
              ) : (
                <>
                  Within 16 days — we&apos;ll use the <b>live weather forecast</b>.
                </>
              )}
            </p>
          )}
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              type="date"
              aria-label="Start date"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink"
              min={today || undefined}
              max={today ? addDaysIso(today, 365) : undefined}
              value={trip.startDate}
              disabled={disabled}
              onChange={(e) => setTrip({ startDate: e.target.value })}
            />
            <div className="flex items-center rounded-xl border border-line bg-white">
              <button aria-label="Fewer days" disabled={disabled || trip.days <= 1} onClick={() => setTrip({ days: trip.days - 1 })} className="h-10 w-9 text-lg disabled:opacity-30">
                −
              </button>
              <span className="w-14 text-center text-sm font-semibold tabular-nums">
                {trip.days} {trip.days === 1 ? "day" : "days"}
              </span>
              <button aria-label="More days" disabled={disabled || trip.days >= 14} onClick={() => setTrip({ days: trip.days + 1 })} className="h-10 w-9 text-lg disabled:opacity-30">
                +
              </button>
            </div>
          </div>
        </Section>

        <Section title="Getting there" hint="Pick all that apply">
          <div className="flex flex-wrap gap-2">
            {TRANSPORT.map((t) => (
              <Chip key={t.id} on={trip.transport.includes(t.id)} onClick={() => toggleTransport(t.id)} disabled={disabled || !placesDone}>
                <span aria-hidden>{t.icon}</span> {t.label}
              </Chip>
            ))}
          </div>
          {!placesDone && !disabled && <p className="mt-2 text-[11px] text-ink-soft">Add both places first.</p>}
        </Section>

        <Section title="Activities & special notes" hint="Optional — add later">
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_TAGS.map((a) => (
              <Chip key={a.id} on={trip.activities.includes(a.id)} onClick={() => toggleActivity(a)} disabled={disabled}>
                <span aria-hidden>{a.icon}</span> {a.label}
              </Chip>
            ))}
          </div>
          <textarea
            value={trip.notes}
            disabled={disabled}
            onChange={(e) => setTrip({ notes: e.target.value })}
            rows={2}
            maxLength={500}
            placeholder="Tap tags above or write your own, e.g. outdoor wedding on day 2"
            className="mt-3 w-full resize-none rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink"
          />
        </Section>
      </div>

      <Button onClick={submit} disabled={disabled || busy} className="mt-4 w-full py-3" variant="coral">
        {busy ? "Checking the weather…" : "Continue to skin scan →"}
      </Button>
      <ErrorText>{error}</ErrorText>

      <div className="mt-5 border-t border-line pt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Or try a demo destination</p>
        <p className="-mt-1 mb-2 text-[11px] text-ink-soft">Fixed sample weather, great for a quick demo.</p>
        <div className="grid grid-cols-3 gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              disabled={disabled || busy}
              onClick={() => onScenario(s.id)}
              className={`rounded-xl border px-2 py-2.5 text-center text-xs font-medium leading-tight transition active:scale-95 ${
                activeScenario === s.id ? "border-coral bg-coral-soft text-coral" : "border-line bg-white hover:bg-paper"
              }`}
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
