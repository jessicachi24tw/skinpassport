// "Why this product for you" bullets, built from the product's verified ingredients
// matched against the user's weakest scores and the destination climate.
// Bullets use **bold** for the key facts (rendered by the UI).

import type { Climate, ConcernReport, IngredientId, Need, NeedId, Product, TripContext } from "../types";
import { INGREDIENTS, type Target } from "./ingredients";
import { climateFactors, sunscreenSpec } from "./necessity";

const BAND_WORD = { weak: "Weak", normal: "Normal", strong: "Strong" } as const;

/** Which concerns/conditions a product category can credibly address. */
const NEED_TARGETS: Record<NeedId, Target[]> = {
  sunscreen: ["uv", "sensitive", "age_spot"],
  barrier_cream: ["moisture", "cold", "dryAir", "redness", "flight"],
  hydrating_serum: ["moisture", "dryAir", "flight", "age_spot", "redness", "oiliness"],
  gel_moisturizer: ["moisture", "heat", "oiliness", "redness"],
  soothing: ["redness", "sensitive", "moisture"],
  brightening: ["age_spot", "uv", "oiliness"],
  after_sun: ["uv", "heat", "redness"],
  gentle_cleanser: ["pollution", "moisture", "redness", "oiliness"],
  lip_care: ["cold", "moisture", "dryAir"],
  face_mist: ["flight", "dryAir", "sensitive"],
};
/** Too common or already covered by the spec bullet — only used as a last resort. */
const BASIC: IngredientId[] = ["glycerin", "uv_filters"];

function findIngredient(product: Product, target: Target, used: Set<IngredientId>) {
  const ok = (i: IngredientId) => INGREDIENTS[i].helps[target] && !used.has(i);
  return product.ingredients.find((i) => ok(i) && !BASIC.includes(i)) ?? (product.needs.includes("sunscreen") ? undefined : product.ingredients.find(ok));
}

export function productReasons(product: Product, need: Need, report: ConcernReport[], climate: Climate, trip: TripContext, max = 4): string[] {
  const f = climateFactors(climate, trip.activities);
  const out: { text: string; weight: number }[] = [];
  const allowed = new Set(NEED_TARGETS[need.id]);
  const used = new Set<IngredientId>();

  // 1) Skin concerns — weakest first.
  for (const c of [...report].sort((a, b) => a.score - b.score)) {
    if (c.band === "strong") continue;
    const target = c.key as Target;
    if (!allowed.has(target)) continue;
    const hit = findIngredient(product, target, used);
    if (!hit) continue;
    used.add(hit);
    const info = INGREDIENTS[hit];
    out.push({
      text: `Your **${c.label.split(" (")[0]}** is **${BAND_WORD[c.band]} (${c.score})** → contains **${info.label}**, which ${info.helps[target]}`,
      weight: 100 - c.score + (c.band === "weak" ? 30 : 0),
    });
  }

  // 2) Travel conditions.
  const conditions: [Target, number, string][] = [
    ["dryAir", f.dryAir, `**${climate.humidityPct}% humidity** at ${climate.locationName.split(" (")[0]}`],
    ["cold", f.cold, `**Cold** down to ${climate.tempMinC}°C`],
    ["uv", f.uv, `**UV ${f.effectiveUv.toFixed(0)}**`],
    ["heat", f.hot, `**Heat** up to ${climate.tempMaxC}°C`],
    ["pollution", f.pollution, `**AQI ${climate.aqiMax}**`],
    ["flight", trip.transport.includes("plane") ? 60 : 0, "**Dry cabin air** on the flight"],
  ];
  for (const [target, level, label] of conditions) {
    if (level < 40 || !allowed.has(target)) continue;
    const hit = findIngredient(product, target, used);
    if (!hit) continue;
    used.add(hit);
    const info = INGREDIENTS[hit];
    out.push({ text: `${label} → **${info.label}** ${info.helps[target]}`, weight: level * 0.6 });
  }

  // 3) Product specs that matter for this trip.
  if (need.id === "sunscreen" && product.spf) {
    const spec = sunscreenSpec(f.effectiveUv, trip.activities);
    out.push({
      text: `Needs **${spec.label}** → this is **SPF ${product.spf}${product.waterResistant ? ", water-resistant" : ""}**`,
      weight: 200,
    });
  }
  const sensitive = report.find((r) => r.key === "redness");
  if (sensitive && sensitive.band !== "strong" && product.fragranceFree) {
    out.push({ text: "**Fragrance-free** — kinder to reactive skin", weight: 20 });
  }

  return out
    .sort((a, b) => b.weight - a.weight)
    .slice(0, max)
    .map((o) => o.text);
}

/** Cautions to show with a product (e.g. retinoid + strong sun). */
export function productCautions(product: Product, climate: Climate, trip: TripContext): string[] {
  const f = climateFactors(climate, trip.activities);
  const out: string[] = [];
  for (const i of product.ingredients) {
    const c = INGREDIENTS[i].caution;
    if (c) out.push(f.uv >= 50 ? `${c} Sun at your destination is strong (UV ${f.effectiveUv.toFixed(0)}).` : c);
  }
  if (!product.fragranceFree) out.push("Contains fragrance — patch-test first if your skin is reactive.");
  return out;
}
