"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { trendingOf } from "@/lib/engine/ingredients";
import { productCautions, productReasons, productTargets } from "@/lib/engine/reasons";
import { concLabel, strengthOf } from "@/lib/engine/concentration";
import { resolveTier } from "@/lib/engine/recommend";
import { bagProducts as bagProductsOf, setApp, toggleBag, toggleOwnedNeed, useApp } from "@/lib/store";
import type { BudgetTier, Climate, ClimateShift, NeedId, PlanResult, Tier, TripContext } from "@/lib/types";
import ProductShot from "./ProductShot";
import TripSkinVisual from "./TripSkinVisual";
import { Card, InfoTip, Rich, StepTitle } from "./ui";

const TIER_STYLE: Record<Tier, string> = {
  must: "bg-coral-soft text-coral",
  recommended: "bg-sun-soft text-[#9a6a14]",
  optional: "bg-sea-soft text-sea",
  skip: "bg-line text-ink-soft",
};
export const TIER_LABEL: Record<Tier, string> = { must: "Must-pack", recommended: "Recommended", optional: "Nice to have", skip: "Skip" };
const SECTIONS: Tier[] = ["must", "recommended", "optional"];

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

export function ClimateStrip({ c, origin, shift }: { c: Climate; origin: Climate | null; shift: ClimateShift | null }) {
  const cells: [string, string, React.ReactNode][] = [
    ["Temp °C", `${Math.round(c.tempMinC)}–${Math.round(c.tempMaxC)}`, shift && <Delta v={shift.tempDeltaC} unit="°" bad={Math.abs(shift.tempDeltaC) >= 8} />],
    ["Humidity", `${c.humidityPct}%`, shift && <Delta v={shift.humidityDelta} unit="%" bad={shift.humidityDelta <= -10} />],
    [c.uvEstimated ? "UV max est." : "UV max", String(c.uvMax), shift && <Delta v={Math.round(shift.uvDelta)} unit="" bad={shift.uvDelta >= 2} />],
    ["AQI", c.aqiMax == null ? "–" : String(c.aqiMax), null],
  ];
  const badge = c.source === "demo" ? "Demo climate" : c.basis === "typical" ? "Typical for these dates" : "Predicted weather";
  return (
    <div className="rounded-2xl bg-ink p-4 text-paper">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-lg">{c.locationName}</p>
          {origin && <p className="truncate text-[11px] text-paper/70">vs. home: {origin.locationName}</p>}
        </div>
        <span className="stamp shrink-0 px-2 py-0.5 text-center text-[10px] font-bold uppercase leading-tight tracking-widest text-coral">{badge}</span>
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
      {c.basis === "typical" && <p className="mt-2 text-[10px] text-paper/60">Based on last year&apos;s weather for the same dates{c.uvEstimated ? "; UV estimated from latitude and season" : ""}.</p>}
    </div>
  );
}

const BUDGETS: { id: BudgetTier; label: string; hint: string }[] = [
  { id: "value", label: "Value", hint: "Drugstore" },
  { id: "balanced", label: "Balanced", hint: "Mid-range" },
  { id: "premium", label: "Premium", hint: "Luxury" },
];

type Item = ReturnType<typeof resolveTier>[number];

function ProductCard({ item, index, climate, trip, plan, ownedNeeds }: { item: Item; index: number; climate: Climate; trip: TripContext; plan: PlanResult; ownedNeeds: NeedId[] }) {
  const { bag, skin } = useApp();
  const skinType = skin?.skinType ?? null;
  const { need, product, coveredBy } = item;
  const shelfOk = item.owned.find((o) => o.meetsSpec);
  const shelfBad = item.owned.find((o) => !o.meetsSpec);
  const have = !!shelfOk || ownedNeeds.includes(need.id);
  const inBag = !!product && bag.includes(product.id);
  const reasons = product && !coveredBy ? productReasons(product, need, plan.report, climate, trip, 4, skinType) : [];
  const cautions = product && !coveredBy ? productCautions(product, climate, trip, plan.report, skinType) : [];
  const stated = product?.concentrations ?? [];
  // Trending badges, without repeating an ingredient that already has a stated %.
  const trending = product ? trendingOf(product.ingredients.filter((i) => !stated.some((c) => c.ingredient === i))) : [];
  const targets = product && !coveredBy ? productTargets(product, plan.report).slice(0, 4) : [];

  const [open, setOpen] = useState(false);
  const details = targets.length + stated.length + trending.length + reasons.length + cautions.length > 0;
  const bar = need.score >= 80 ? "bg-coral" : need.score >= 60 ? "bg-sun" : "bg-sea";

  return (
    <li
      className={`animate-[fadeUp_.4s_ease-out_both] rounded-xl border p-3.5 transition ${have ? "border-dashed border-sea/50 bg-sea-soft/40" : "border-line bg-white"}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Category + necessity (number and a short bar) */}
      <div className="flex items-center justify-between gap-3">
        <h3 className={`min-w-0 truncate font-semibold ${have ? "text-ink-soft" : ""}`}>
          {need.title}
          {need.spec && <span className="ml-1.5 text-xs font-medium text-coral">{need.spec}</span>}
        </h3>
        <div className={`flex shrink-0 items-center gap-1.5 ${have ? "opacity-50" : ""}`} title="Necessity for this trip, 0 to 100">
          <span className="text-base font-bold tabular-nums">
            <CountUp value={need.score} />
          </span>
          <span className="h-1.5 w-12 overflow-hidden rounded-full bg-line">
            <span className={`block h-full rounded-full ${bar}`} style={{ width: `${need.score}%` }} />
          </span>
        </div>
      </div>

      {have && (
        <p className="mt-2 text-xs font-semibold text-sea">
          ✓ Packed from home{shelfOk ? `: ${`${shelfOk.product.brand} ${shelfOk.product.name}`.trim()}` : ""}
        </p>
      )}
      {shelfBad && !shelfOk && !have && (
        <p className="mt-2 rounded-lg bg-coral-soft px-3 py-1.5 text-xs text-coral">
          <b>{shelfBad.product.name}</b>: {shelfBad.note}
        </p>
      )}
      {!have && product && coveredBy && (
        <p className="mt-2 text-xs text-ink-soft">
          Covered by <b className="text-ink">{product.brand} {product.name}</b> ({coveredBy.toLowerCase()}).
        </p>
      )}

      {/* The product */}
      {!have && product && !coveredBy && (
        <div className="mt-2.5 flex items-center gap-3">
          <Link href={`/product/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <ProductShot product={product} size={56} />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{product.brand}</p>
              <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
              <p className="text-xs text-ink-soft">~${product.estPriceUsd}</p>
            </div>
          </Link>
          <div className="flex w-[104px] shrink-0 flex-col gap-1.5">
            <button
              onClick={() => toggleBag(product.id)}
              aria-pressed={inBag}
              className={`rounded-lg py-1.5 text-xs font-bold transition active:scale-95 ${inBag ? "bg-sea text-white" : "bg-coral text-white hover:bg-coral/90"}`}
            >
              {inBag ? "✓ In bag" : "+ Bag"}
            </button>
            <label className="flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap text-[10px] leading-tight text-ink-soft">
              <input type="checkbox" checked={false} onChange={() => toggleOwnedNeed(need.id)} className="h-3 w-3 shrink-0 accent-sea" />I already have it
            </label>
          </div>
        </div>
      )}
      {/* "Have it" ticked (not from the shelf): let them undo */}
      {have && !shelfOk && (
        <label className="mt-1.5 flex w-fit cursor-pointer items-center gap-1.5 text-[11px] text-ink-soft">
          <input type="checkbox" checked onChange={() => toggleOwnedNeed(need.id)} className="h-3 w-3 accent-sea" />I already have it
        </label>
      )}

      {/* Everything else, folded */}
      {!have && details && (
        <>
          <button onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2.5 flex w-full items-center justify-between border-t border-line pt-2 text-[12px] font-semibold text-ink-soft hover:text-ink">
            <span>
              Why this one
              {cautions.length > 0 && (
                <span className="ml-2 rounded-full bg-sun-soft px-1.5 py-px text-[10px] font-bold text-[#8a5d10]">
                  ⚠︎ {cautions.length} note{cautions.length > 1 ? "s" : ""}
                </span>
              )}
            </span>
            <span aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>
              ▾
            </span>
          </button>
          {open && (
            <div className="mt-2 space-y-2 animate-[fadeUp_.25s_ease-out]">
              {targets.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Targets</span>
                  {targets.map((t) => (
                    <span key={t.key} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.band === "weak" ? "bg-coral-soft text-coral" : "bg-sun-soft text-[#8a5d10]"}`}>
                      {t.label.split(" (")[0]} {t.score}
                    </span>
                  ))}
                </div>
              )}
              {(stated.length > 0 || trending.length > 0) && (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Ingredients</span>
                  {stated.map((c) => (
                    <span key={c.ingredient} className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-paper">
                      {concLabel(c)}
                      {strengthOf(c) === "high" ? " · High" : ""}
                    </span>
                  ))}
                  {trending.map((t) => (
                    <span key={t} className="rounded-full border border-sea/30 bg-sea-soft px-2 py-0.5 text-[10px] font-semibold text-sea">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {reasons.length > 0 && (
                <ul className="space-y-1 text-xs leading-relaxed text-ink-soft">
                  {reasons.map((r) => (
                    <li key={r} className="flex gap-1.5">
                      <span aria-hidden>•</span>
                      <span>
                        <Rich text={r} />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {cautions.map((c) => (
                <p key={c} className="rounded-lg bg-sun-soft px-2.5 py-1.5 text-[11px] text-[#8a5d10]">
                  ⚠︎ {c}
                </p>
              ))}
              <Link href={`/product/${product!.id}`} className="inline-block text-[11px] font-semibold text-sea hover:underline">
                Full details ›
              </Link>
            </div>
          )}
        </>
      )}
    </li>
  );
}

export default function Results({ plan, climate, origin, trip }: { plan: PlanResult; climate: Climate; origin: Climate | null; trip: TripContext }) {
  const app = useApp();
  const { budget, ownedNeeds } = app;
  const items = resolveTier(plan.items, budget);
  const bagProducts = bagProductsOf(app);
  const total = bagProducts.reduce((t, p) => t + p.estPriceUsd, 0);
  const haveCount = items.filter((i) => ownedNeeds.includes(i.need.id) || i.owned.some((o) => o.meetsSpec)).length;
  const ready = bagProducts.length + haveCount > 0;

  return (
    <div className="space-y-4">
      <ClimateStrip c={climate} origin={origin} shift={plan.shift} />

      <Card>
        <TripSkinVisual plan={plan} photo={app.photo} mirrored={app.photoMirrored} />
      </Card>

      <Card>
        <StepTitle n={4} title="Your travel skin plan" />
        {plan.warnings.map((w) => (
          <p key={w} className="mb-3 rounded-lg bg-sun-soft px-3 py-2 text-xs text-[#7a5410]">
            ⚠︎ {w}
          </p>
        ))}
        <div className="mb-4">
          <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Budget
            <InfoTip text="Tap + Bag for what you want to buy, and tick I already have it for anything you own." label="How to pick" />
          </p>
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

        {SECTIONS.map((tier) => {
          const list = items.filter((i) => i.need.tier === tier);
          if (!list.length) return null;
          return (
            <section key={tier} className="mb-5 last:mb-0">
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${TIER_STYLE[tier]}`}>{TIER_LABEL[tier]}</span>
                <span>{list.length}</span>
              </h3>
              <ul className="space-y-3">
                {list.map((item, i) => (
                  <ProductCard key={`${item.need.id}-${budget}`} item={item} index={i} climate={climate} trip={trip} plan={plan} ownedNeeds={ownedNeeds} />
                ))}
              </ul>
            </section>
          );
        })}
        <p className="mt-3 text-[11px] text-ink-soft">Prices are estimates. Ingredients checked against each product&apos;s published ingredient list.</p>
      </Card>

      {/* Sticky action bar */}
      <div className="sticky bottom-3 z-30 rounded-2xl bg-ink p-3 text-paper shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs">
            <p>
              <b className="tabular-nums">{bagProducts.length}</b> to buy · <b className="tabular-nums">${Math.round(total)}</b>
            </p>
            <p className="text-paper/70">{haveCount} from home</p>
          </div>
          {ready ? (
            <Link href="/plan" className="rounded-xl bg-coral px-4 py-2.5 text-sm font-bold text-white hover:bg-coral/90">
              Create my action plan →
            </Link>
          ) : (
            <span className="rounded-xl bg-white/10 px-4 py-2.5 text-xs text-paper/70">Pick products to create your action plan</span>
          )}
        </div>
      </div>
    </div>
  );
}
