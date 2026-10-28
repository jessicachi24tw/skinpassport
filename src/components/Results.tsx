"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resolveKit } from "@/lib/engine/kits";
import { addToBag, setApp, toggleBag, toggleOwned, useApp } from "@/lib/store";
import type { BudgetTier, Climate, ClimateShift, Kit, NeedId, PlanResult, Tier } from "@/lib/types";

type ResolvedItem = ReturnType<typeof resolveKit>[number];
import ProductShot from "./ProductShot";
import { Card, Stars, StepTitle } from "./ui";

const TIER_STYLE: Record<Tier, string> = {
  must: "bg-coral-soft text-coral",
  recommended: "bg-sun-soft text-[#9a6a14]",
  optional: "bg-sea-soft text-sea",
  skip: "bg-line text-ink-soft",
};
export const TIER_LABEL: Record<Tier, string> = { must: "Must-pack", recommended: "Recommended", optional: "Nice to have", skip: "Skip" };

/** Animated number that counts up from 0 when it first appears. */
function CountUp({ value, ms = 700 }: { value: number; ms?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <>{n}</>;
}

/** Change vs. home. Coral = a change your skin will feel, teal = easier on skin. */
function Delta({ v, unit, bad }: { v: number; unit: string; bad: boolean }) {
  if (Math.abs(v) < 1) return <span className="text-paper/50">±0</span>;
  return (
    <span className={bad ? "text-[#ffb4a6]" : "text-[#9be3d7]"}>
      {v > 0 ? "▲" : "▼"} {Math.abs(v)}
      {unit}
    </span>
  );
}

function ClimateStrip({ c, origin, shift }: { c: Climate; origin: Climate | null; shift: ClimateShift | null }) {
  const cells: [string, string, React.ReactNode][] = [
    ["Temp °C", `${Math.round(c.tempMinC)}–${Math.round(c.tempMaxC)}`, shift && <Delta v={shift.tempDeltaC} unit="°" bad={Math.abs(shift.tempDeltaC) >= 8} />],
    ["Humidity", `${c.humidityPct}%`, shift && <Delta v={shift.humidityDelta} unit="%" bad={shift.humidityDelta <= -10} />],
    ["UV max", String(c.uvMax), shift && <Delta v={Math.round(shift.uvDelta)} unit="" bad={shift.uvDelta >= 2} />],
    ["AQI", c.aqiMax == null ? "–" : String(c.aqiMax), null],
  ];
  return (
    <div className="rounded-2xl bg-ink p-4 text-paper">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-lg">{c.locationName}</p>
          {origin && <p className="truncate text-[11px] text-paper/70">vs. home: {origin.locationName}</p>}
        </div>
        <span className="stamp shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-coral">{c.source === "demo" ? "Demo climate" : "Live forecast"}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {cells.map(([k, v, d]) => (
          <div key={k} className="rounded-lg bg-white/10 px-1 py-2">
            <p className="text-[10px] uppercase tracking-wider text-paper/70">{k}</p>
            <p className="text-sm font-semibold tabular-nums">{v}</p>
            {d && <p className="text-[10px] font-semibold tabular-nums">{d}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

const BUDGETS: { id: BudgetTier; label: string; hint: string }[] = [
  { id: "value", label: "Value", hint: "Drugstore" },
  { id: "balanced", label: "Balanced", hint: "Mid-range" },
  { id: "premium", label: "Premium", hint: "Luxury" },
];

function KitList({ items, owned }: { items: ResolvedItem[]; owned: NeedId[] }) {
  const { bag } = useApp();
  const [openReasons, setOpenReasons] = useState<string | null>(null);
  if (!items.length) return <p className="text-sm text-ink-soft">Nothing extra needed — your usual routine is enough.</p>;
  return (
    <ul className="space-y-3">
      {items.map(({ need, product, coveredBy }, i) => {
        const have = owned.includes(need.id);
        const inBag = !!product && bag.includes(product.id);
        const showReasons = !have && (openReasons === need.id || i === 0);
        return (
          <li
            key={need.id}
            className={`animate-[fadeUp_.4s_ease-out_both] rounded-xl border p-4 transition ${have ? "border-dashed border-sea/50 bg-sea-soft/40" : "border-line"}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${have ? "bg-sea text-white" : TIER_STYLE[need.tier]}`}>
                  {have ? "✓ Packed from home" : TIER_LABEL[need.tier]}
                </span>
                <h3 className={`mt-1.5 font-semibold ${have ? "text-ink-soft" : ""}`}>{need.title}</h3>
                {need.spec && <p className="text-xs font-medium text-coral">{have ? "Check yours is: " : "Need: "}{need.spec}</p>}
              </div>
              <div className={`text-right ${have ? "opacity-50" : ""}`}>
                <p className="text-xl font-bold tabular-nums leading-none">
                  <CountUp value={need.score} />
                </p>
                <p className="text-[10px] uppercase tracking-wider text-ink-soft">necessity</p>
                <Stars n={need.stars} />
              </div>
            </div>
            {!have && (
              <div className="mt-2 h-1.5 rounded-full bg-line">
                <div className="h-1.5 rounded-full bg-coral transition-[width] duration-700" style={{ width: `${need.score}%` }} />
              </div>
            )}
            {need.reasons.length > 0 &&
              !have &&
              (showReasons ? (
                <ul className="mt-2 space-y-0.5 text-xs text-ink-soft">
                  {need.reasons.map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
              ) : (
                <button onClick={() => setOpenReasons(need.id)} aria-expanded={false} className="mt-2 text-xs font-semibold text-ink hover:underline">
                  Why? ({need.reasons.length}) ▾
                </button>
              ))}
            {product && !have && coveredBy && (
              <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-xs text-ink-soft">
                Covered by your <b className="text-ink">{product.brand} {product.name}</b> (listed under {coveredBy.toLowerCase()}).
              </p>
            )}
            {product && !have && !coveredBy && (
              <div className="mt-3 flex items-center gap-3 rounded-lg bg-paper p-2.5">
                <Link href={`/product/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <ProductShot product={product} size={56} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{product.brand}</p>
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
                    <p className="text-xs text-ink-soft">
                      ~${product.estPriceUsd} est. · <span className="font-semibold text-sea">Details ›</span>
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => toggleBag(product.id)}
                  aria-pressed={inBag}
                  className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition active:scale-95 ${inBag ? "bg-sea text-white" : "bg-coral text-white hover:bg-coral/90"}`}
                >
                  {inBag ? "✓ In bag" : "+ Bag"}
                </button>
              </div>
            )}
            <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-xs text-ink-soft">
              <input type="checkbox" checked={have} onChange={() => toggleOwned(need.id)} className="h-3.5 w-3.5 accent-sea" />
              I already have this
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export default function Results({ plan, climate, origin }: { plan: PlanResult; climate: Climate; origin: Climate | null }) {
  const { budget, owned } = useApp();
  const [kitId, setKitId] = useState<Kit["id"]>("essential");
  const [done, setDone] = useState<string[]>([]);
  const kit = plan.kits.find((k) => k.id === kitId) ?? plan.kits[0];
  const items = resolveKit(kit, budget);
  const toBuy = items.filter((r) => r.product && !r.coveredBy && !owned.includes(r.need.id));
  const ids = toBuy.map((r) => r.product!.id);
  const total = toBuy.reduce((t, r) => t + r.product!.estPriceUsd, 0);
  const haveCount = items.filter((r) => owned.includes(r.need.id)).length;
  return (
    <div className="space-y-4">
      <ClimateStrip c={climate} origin={origin} shift={plan.shift} />

      <Card>
        <StepTitle n={3} title="Your travel skin plan" />
        <p className="rounded-xl bg-sea-soft p-3 text-sm leading-relaxed text-ink">{plan.coachNote}</p>

        <div className="mt-5 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">This week, before you go</h3>
          <span className="text-[11px] text-ink-soft tabular-nums">
            {done.length}/{plan.preTrip.length} done
          </span>
        </div>
        <ul className="mt-2 space-y-2">
          {plan.preTrip.map((t) => {
            const on = done.includes(t);
            return (
              <li key={t}>
                <label className="flex cursor-pointer gap-2 text-sm">
                  <input type="checkbox" checked={on} onChange={() => setDone(on ? done.filter((d) => d !== t) : [...done, t])} className="mt-0.5 h-4 w-4 shrink-0 accent-sea" />
                  <span className={on ? "text-ink-soft line-through" : ""}>{t}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-paper p-1 text-sm font-semibold">
          {plan.kits.map((k) => (
            <button key={k.id} onClick={() => setKitId(k.id)} className={`rounded-lg py-2 transition ${kitId === k.id ? "bg-white shadow-sm" : "text-ink-soft"}`}>
              {k.title} <span className="font-normal text-ink-soft">({k.items.length})</span>
            </button>
          ))}
        </div>
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-soft">Budget</p>
          <div role="radiogroup" aria-label="Budget" className="grid grid-cols-3 gap-1.5">
            {BUDGETS.map((b) => (
              <button
                key={b.id}
                role="radio"
                aria-checked={budget === b.id}
                onClick={() => setApp({ budget: b.id })}
                className={`rounded-xl border px-2 py-2 text-center transition active:scale-95 ${budget === b.id ? "border-ink bg-ink text-paper" : "border-line bg-white hover:border-ink/40"}`}
              >
                <span className="block text-sm font-semibold">{b.label}</span>
                <span className={`block text-[10px] ${budget === b.id ? "text-paper/70" : "text-ink-soft"}`}>{b.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <KitList key={`${kitId}-${budget}`} items={items} owned={owned} />
        <div className="mt-4 border-t border-line pt-4">
          {haveCount > 0 && (
            <p className="mb-1 flex justify-between text-xs text-sea">
              <span>Already packed from home</span>
              <span className="font-semibold">{haveCount} item{haveCount === 1 ? "" : "s"}</span>
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-soft">
              To buy · {toBuy.length} item{toBuy.length === 1 ? "" : "s"}
            </p>
            <p className="font-display text-2xl tabular-nums">
              $<CountUp key={`${budget}-${total}`} value={total} />
            </p>
          </div>
        </div>
        <button
          onClick={() => addToBag(ids)}
          disabled={!ids.length}
          className="mt-3 w-full rounded-xl bg-ink py-3 text-sm font-bold text-paper transition hover:bg-ink/90 active:scale-[0.98] disabled:opacity-40"
        >
          {ids.length ? `Add ${toBuy.length} item${toBuy.length === 1 ? "" : "s"} to bag` : "You're all set — nothing to buy"}
        </button>
        <p className="mt-2 text-[11px] text-ink-soft">Prices are estimates. Check the retailer for current prices.</p>
      </Card>

      <Card>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">During the trip</h3>
        <ul className="mt-2 space-y-1.5 text-sm">
          {plan.duringTrip.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
