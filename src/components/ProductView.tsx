"use client";

import Link from "next/link";
import { NEED_TITLES } from "@/lib/engine/necessity";
import { toggleBag, useApp } from "@/lib/store";
import type { Product } from "@/lib/types";
import Bag from "./Bag";
import ProductShot from "./ProductShot";
import { TIER_LABEL } from "./Results";
import { Card, Stars } from "./ui";

export default function ProductView({ product, alternatives }: { product: Product; alternatives: Product[] }) {
  const { plan, climate, bag, budget } = useApp();
  const inBag = bag.includes(product.id);
  // Find why this product is in the user's plan (if it is).
  const complete = plan?.kits.find((k) => k.id === "complete");
  const rec =
    complete?.items.find((r) => r.options[budget]?.id === product.id) ??
    complete?.items.find((r) => Object.values(r.options).some((o) => o?.id === product.id)) ??
    null;
  const facts: [string, string][] = [
    ["Best for", product.needs.map((n) => NEED_TITLES[n]).join(", ")],
    ["Price range", { value: "Value · drugstore", balanced: "Balanced · mid-range", premium: "Premium · luxury" }[product.tier]],
    ["Texture", product.texture ? product.texture[0].toUpperCase() + product.texture.slice(1) : "—"],
    ...(product.spf ? ([["Sun protection", `SPF ${product.spf}${product.waterResistant ? " · water-resistant" : ""}`]] as [string, string][]) : []),
    ["Sensitive skin", product.sensitiveFriendly ? "Suitable" : "Patch-test first"],
  ];

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-4">
      <Link href="/#plan" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink">
        ‹ Back to my plan
      </Link>

      <Card className="text-center">
        <div className="flex justify-center">
          <ProductShot product={product} size={220} />
        </div>
        {product.image && (
          <p className="mt-1 text-[10px] text-ink-soft">
            Photo:{" "}
            <a href={product.image.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Open Beauty Facts
            </a>{" "}
            contributors,{" "}
            <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" className="underline">
              CC BY-SA 3.0
            </a>{" "}
            · background removed
          </p>
        )}
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft">{product.brand}</p>
        <h1 className="mt-1 font-display text-2xl leading-tight">{product.name}</h1>
        <p className="mt-2 text-sm text-ink-soft">{product.tagline}</p>
        <p className="mt-3 font-display text-3xl tabular-nums">~${product.estPriceUsd}</p>
        <p className="text-[11px] text-ink-soft">Estimated price — check the retailer</p>
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

      {rec && (
        <Card className="mt-4 border-coral/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-coral">Why it&apos;s in your plan</p>
              <p className="mt-1 font-semibold">
                {rec.need.title} · {TIER_LABEL[rec.need.tier]}
              </p>
              {climate && <p className="text-xs text-ink-soft">for {climate.locationName}</p>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums leading-none">{rec.need.score}</p>
              <p className="text-[10px] uppercase tracking-wider text-ink-soft">necessity</p>
              <Stars n={rec.need.stars} />
            </div>
          </div>
          {rec.need.spec && <p className="mt-2 text-xs font-medium text-coral">You need: {rec.need.spec}</p>}
          <ul className="mt-2 space-y-0.5 text-sm text-ink-soft">
            {rec.need.reasons.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">About</h2>
        <p className="mt-2 text-sm leading-relaxed">{product.description}</p>
        <dl className="mt-4 divide-y divide-line text-sm">
          {facts.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-ink-soft">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card className="mt-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">Key ingredients</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.keyIngredients.map((k) => (
            <span key={k} className="rounded-full bg-sea-soft px-3 py-1 text-xs font-medium text-sea">
              {k}
            </span>
          ))}
        </div>
        <h2 className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-soft">How to use</h2>
        <p className="mt-2 text-sm leading-relaxed">{product.howToUse}</p>
        <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-xs text-ink-soft">✈️ Carry-on tip: liquids must be 100 ml (3.4 oz) or less per container. Decant larger sizes into travel bottles.</p>
      </Card>

      {alternatives.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">Alternatives</h2>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {alternatives.map((a) => (
              <Link key={a.id} href={`/product/${a.id}`} className="w-40 shrink-0 snap-start rounded-2xl border border-line bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <ProductShot product={a} size={80} />
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{a.brand}</p>
                <p className="line-clamp-2 text-sm font-medium leading-snug">{a.name}</p>
                <p className="mt-1 text-xs text-ink-soft">~${a.estPriceUsd}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-center text-[11px] text-ink-soft">Product info is a summary for the demo. Always read the label. Not medical advice.</p>
      <Bag />
    </main>
  );
}
