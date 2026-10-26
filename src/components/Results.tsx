"use client";

import { useState } from "react";
import type { Climate, Kit, PlanResult, Tier } from "@/lib/types";
import { Card, Stars, StepTitle } from "./ui";

const TIER_STYLE: Record<Tier, string> = {
  must: "bg-coral-soft text-coral",
  recommended: "bg-sun-soft text-[#9a6a14]",
  optional: "bg-sea-soft text-sea",
  skip: "bg-line text-ink-soft",
};
const TIER_LABEL: Record<Tier, string> = { must: "Must-pack", recommended: "Recommended", optional: "Nice to have", skip: "Skip" };

function ClimateStrip({ c }: { c: Climate }) {
  const aqi = c.aqiMax == null ? "–" : String(c.aqiMax);
  const cells = [
    ["Temp °C", `${Math.round(c.tempMinC)}–${Math.round(c.tempMaxC)}`],
    ["Humidity", `${c.humidityPct}%`],
    ["UV max", String(c.uvMax)],
    ["AQI", aqi],
  ];
  return (
    <div className="rounded-2xl bg-ink p-4 text-paper">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-lg">{c.locationName}</p>
        <span className="stamp px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-coral">{c.source === "demo" ? "Demo climate" : "Live forecast"}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {cells.map(([k, v]) => (
          <div key={k} className="rounded-lg bg-white/10 px-1 py-2">
            <p className="text-[10px] uppercase tracking-wider text-paper/70">{k}</p>
            <p className="text-sm font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function KitList({ kit }: { kit: Kit }) {
  if (!kit.items.length) return <p className="text-sm text-ink-soft">Nothing extra needed — your usual routine is enough.</p>;
  return (
    <ul className="space-y-3">
      {kit.items.map(({ need, product }) => (
        <li key={need.id} className="rounded-xl border border-line p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TIER_STYLE[need.tier]}`}>{TIER_LABEL[need.tier]}</span>
              <h3 className="mt-1.5 font-semibold">{need.title}</h3>
              {need.spec && <p className="text-xs font-medium text-coral">Need: {need.spec}</p>}
            </div>
            <div className="text-right">
              <p className="text-xl font-bold tabular-nums leading-none">{need.score}</p>
              <p className="text-[10px] uppercase tracking-wider text-ink-soft">necessity</p>
              <Stars n={need.stars} />
            </div>
          </div>
          {need.reasons.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-ink-soft">
              {need.reasons.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          )}
          {product && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{product.brand}</p>
                <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
                <p className="text-xs text-ink-soft">~${product.estPriceUsd} est.</p>
              </div>
              <a href={product.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-coral px-3 py-2 text-xs font-bold text-white hover:bg-coral/90">
                Buy now
              </a>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Results({ plan, climate }: { plan: PlanResult; climate: Climate }) {
  const [kitId, setKitId] = useState<Kit["id"]>("essential");
  const kit = plan.kits.find((k) => k.id === kitId) ?? plan.kits[0];

  return (
    <div className="space-y-4">
      <ClimateStrip c={climate} />

      <Card>
        <StepTitle n={3} title="Your travel skin plan" />
        <p className="rounded-xl bg-sea-soft p-3 text-sm leading-relaxed text-ink">{plan.coachNote}</p>

        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-soft">This week, before you go</h3>
        <ul className="mt-2 space-y-2">
          {plan.preTrip.map((t) => (
            <li key={t} className="flex gap-2 text-sm">
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-ink/40" aria-hidden /> {t}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="mb-4 grid grid-cols-2 rounded-xl bg-paper p-1 text-sm font-semibold">
          {plan.kits.map((k) => (
            <button key={k.id} onClick={() => setKitId(k.id)} className={`rounded-lg py-2 ${kitId === k.id ? "bg-white shadow-sm" : "text-ink-soft"}`}>
              {k.title} <span className="font-normal text-ink-soft">({k.items.length})</span>
            </button>
          ))}
        </div>
        <KitList kit={kit} />
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <p className="text-sm text-ink-soft">Estimated cart</p>
          <p className="font-display text-2xl tabular-nums">${kit.subtotalUsd}</p>
        </div>
        <p className="mt-1 text-[11px] text-ink-soft">Prices are estimates. Check the retailer for current prices.</p>
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
