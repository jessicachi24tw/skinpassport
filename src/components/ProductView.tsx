"use client";

import Link from "next/link";
import { INGREDIENTS } from "@/lib/engine/ingredients";
import { concentrationOf, strengthOf, USUAL } from "@/lib/engine/concentration";
import { NEED_TITLES } from "@/lib/engine/necessity";
import { productCautions, productReasons } from "@/lib/engine/reasons";
import { toggleBag, useApp } from "@/lib/store";
import type { Product } from "@/lib/types";
import ProductShot from "./ProductShot";
import { TIER_LABEL } from "./Results";
import { Card, Rich, Stars } from "./ui";

export default function ProductView({ product, alternatives }: { product: Product; alternatives: Product[] }) {
  const { plan, climate, bag, budget, trip, skin } = useApp();
  const inBag = bag.includes(product.id);
  // Find why this product is in the user's plan (if it is), or which of the user's needs it covers.
  const rec =
    plan?.items.find((r) => r.options[budget]?.id === product.id) ??
    plan?.items.find((r) => Object.values(r.options).some((o) => o?.id === product.id)) ??
    plan?.items.find((r) => product.needs.includes(r.need.id)) ??
    null;
  const ctx = { activities: trip.activities, transport: trip.transport, days: trip.days };
  const reasons = rec && plan && climate ? productReasons(product, rec.need, plan.report, climate, ctx, 5, skin?.skinType ?? null) : [];
  const cautions = climate ? productCautions(product, climate, ctx, plan?.report ?? [], skin?.skinType ?? null) : [];
  const facts: [string, string][] = [
    ["Best for", product.needs.map((n) => NEED_TITLES[n]).join(", ")],
    ["Price range", { value: "Value · drugstore", balanced: "Balanced · mid-range", premium: "Premium · luxury" }[product.tier]],
    ["Texture", product.texture ? product.texture[0].toUpperCase() + product.texture.slice(1) : "Not listed"],
    ...(product.spf ? ([["Sun protection", `SPF ${product.spf}${product.waterResistant ? " · water-resistant" : ""}`]] as [string, string][]) : []),
    ["Fragrance", product.fragranceFree ? "Fragrance-free" : "Contains fragrance"],
    ["Sensitive skin", product.sensitiveFriendly ? "Suitable" : "Patch-test first"],
    ...(product.longTerm ? ([["Time to see results", "About 4 weeks of daily use"]] as [string, string][]) : []),
    ["Group", product.loreal ? "L'Oréal Groupe" : "Other brand"],
  ];

  return (
    <main className="with-nav mx-auto max-w-md px-4 pb-10 pt-4 lg:max-w-5xl lg:px-10 lg:pt-10">
      <Link href="/trip" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        ‹ Back to my plan
      </Link>

      <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-6">
      {/* 1. Product */}
      <Card className="text-center lg:sticky lg:top-10">
        <div className="flex justify-center">
          <ProductShot product={product} size={220} />
        </div>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">{product.brand}</p>
        <h1 className="mt-1 font-display text-2xl leading-tight">{product.name}</h1>
        <p className="mt-2 text-sm text-ink-soft">{product.tagline}</p>
        <p className="mt-3 font-display text-3xl tabular-nums">~${product.estPriceUsd}</p>
        <p className="text-[11px] text-ink-soft">Estimated price</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => toggleBag(product.id)}
            aria-pressed={inBag}
            className={`rounded-xl py-3 text-sm font-bold transition active:scale-95 ${inBag ? "bg-sea text-white" : "border border-ink bg-white text-ink"}`}
          >
            {inBag ? "✓ In your bag" : "+ Add to bag"}
          </button>
          <a href={product.url} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-coral py-3 text-sm font-bold text-white hover:bg-coral/90">
            Buy now ↗
          </a>
        </div>
      </Card>

      <div className="lg:[&>section:first-child]:mt-0">
      {/* 2. Why it's in your plan */}
      {rec && (
        <Section icon="🎯" title="Why it's in your plan">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-paper px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{rec.need.title}</p>
              <p className="text-xs text-ink-soft">
                {TIER_LABEL[rec.need.tier]}
                {climate ? ` for ${climate.locationName.split(" (")[0]}` : ""}
              </p>
              {rec.need.spec && <p className="text-xs font-medium text-coral">You need: {rec.need.spec}</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-bold tabular-nums leading-none">{rec.need.score}</p>
              <p className="text-[10px] uppercase tracking-wider text-ink-soft">necessity</p>
              <Stars n={rec.need.stars} />
            </div>
          </div>
          <Bullets items={reasons.length ? reasons : rec.need.reasons} />
          {cautions.map((c) => (
            <p key={c} className="mt-2 rounded-lg bg-sun-soft px-3 py-2 text-xs text-[#7a5410]">
              ⚠︎ {c}
            </p>
          ))}
        </Section>
      )}

      {/* 3. Key ingredients */}
      <Section
        icon="🧪"
        title="Key ingredients"
        aside={
          <a href={product.ingredientSource} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-sea hover:underline">
            Source ↗
          </a>
        }
      >
        <ul className="space-y-2.5">
          {product.ingredients.map((id) => {
            const info = INGREDIENTS[id];
            const first = Object.values(info.helps)[0]?.replace(/^(is|are) /, "");
            const conc = concentrationOf(product, id);
            return (
              <li key={id} className="text-sm">
                <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                  {conc?.label ?? info.label}
                  {conc && <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-bold text-paper">{conc.pct}%</span>}
                  {info.trending && <span className="rounded-full bg-sea px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Trending</span>}
                </p>
                {conc && USUAL[id] && <StrengthMeter pct={conc.pct} range={USUAL[id]!} level={strengthOf(conc)!} />}
                <p className="text-ink-soft">{info.caution ?? (first ? first[0].toUpperCase() + first.slice(1) : "")}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 4. How to use */}
      <Section icon="🧴" title="How to use">
        <p className="text-sm leading-relaxed text-ink-soft">{product.howToUse}</p>
        <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-xs text-ink-soft">✈️ Carry-on: liquids up to 100 ml (3.4 oz) per container. Decant larger sizes.</p>
      </Section>

      {/* 5. About */}
      <Section icon="📋" title="About">
        <p className="text-sm leading-relaxed text-ink-soft">{product.description}</p>
        <dl className="mt-3 divide-y divide-line text-sm">
          {facts.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-ink-soft">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* 6. Alternatives */}
      {alternatives.length > 0 && (
        <Section icon="🔁" title="Alternatives">
          <div className="-mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1">
            {alternatives.map((a) => (
              <Link key={a.id} href={`/product/${a.id}`} className="w-36 shrink-0 snap-start rounded-2xl border border-line bg-paper/50 p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <ProductShot product={a} size={80} />
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{a.brand}</p>
                <p className="line-clamp-2 text-sm font-medium leading-snug">{a.name}</p>
                <p className="mt-1 text-xs text-ink-soft">~${a.estPriceUsd}</p>
              </Link>
            ))}
          </div>
        </Section>
      )}

      </div>
      </div>
      <p className="mt-6 text-center text-[10px] leading-relaxed text-ink-soft">
        {product.image && (
          <>
            Photo:{" "}
            <a href={product.image.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Open Beauty Facts
            </a>{" "}
            contributors,{" "}
            <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" className="underline">
              CC BY-SA 3.0
            </a>
            , background removed.{" "}
          </>
        )}
        Product info is a summary for the demo. Always read the label. Not medical advice.
      </p>
    </main>
  );
}

/** Every section on the page uses the same card, heading and spacing. */
function Section({ icon, title, aside, children }: { icon: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="mt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-ink">
          <span aria-hidden className="text-sm">
            {icon}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </Card>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-ink-soft">
      {items.map((r) => (
        <li key={r} className="flex gap-2">
          <span aria-hidden className="text-sea">
            ●
          </span>
          <span>
            <Rich text={r} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Stated % on a scale, with the commonly used range shaded. */
function StrengthMeter({ pct, range, level }: { pct: number; range: [number, number]; level: "gentle" | "standard" | "high" }) {
  const max = Math.max(range[1] * 2, pct * 1.15);
  const x = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  const word = { gentle: "Gentle", standard: "Standard", high: "High strength" }[level];
  return (
    <div className="my-1.5">
      <div className="relative h-2 rounded-full bg-line">
        <div className="absolute inset-y-0 rounded-full bg-sea/30" style={{ left: x(range[0]), width: `calc(${x(range[1])} - ${x(range[0])})` }} />
        <div className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${level === "high" ? "bg-coral" : "bg-sea"}`} style={{ left: x(pct) }} />
      </div>
      <p className="mt-1 text-[11px] text-ink-soft">
        <b className={level === "high" ? "text-coral" : "text-sea"}>{word}</b> · stated {pct}% · usual {range[0]}–{range[1]}%
      </p>
    </div>
  );
}
