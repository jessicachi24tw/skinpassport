// "Why this product for you" bullets, built from the product's verified ingredients
// matched against the user's weakest scores and the destination climate.
// Bullets use **bold** for the key facts (rendered by the UI).

import type { Climate, ConcernReport, IngredientId, Need, NeedId, Product, SkinScores, SkinType, TripContext } from "../types";
import { INGREDIENTS, type Target } from "./ingredients";
import { climateFactors, sunscreenSpec } from "./necessity";
import { cleanserKind, traitsOf } from "./skinType";
import { concentrationOf, concLabel, strengthOf, usualLabel } from "./concentration";

const BAND_WORD = { weak: "Weak", normal: "Normal", strong: "Strong" } as const;

/** Which concerns/conditions a product category can credibly address. */
const NEED_TARGETS: Record<NeedId, Target[]> = {
  sunscreen: ["uv", "sensitive", "age_spot"],
  barrier_cream: ["moisture", "texture", "cold", "dryAir", "redness", "flight"],
  hydrating_serum: ["moisture", "texture", "radiance", "dryAir", "flight", "age_spot", "redness", "oiliness"],
  gel_moisturizer: ["moisture", "heat", "oiliness", "pore", "acne", "redness"],
  soothing: ["redness", "acne", "sensitive", "moisture"],
  brightening: ["age_spot", "radiance", "uv", "oiliness"],
  after_sun: ["uv", "heat", "redness"],
  gentle_cleanser: ["pollution", "moisture", "redness", "oiliness", "pore", "acne"],
  lip_care: ["cold", "moisture", "dryAir"],
  face_mist: ["flight", "dryAir", "sensitive"],
  blemish_care: ["acne", "oiliness", "pore"],
  pore_serum: ["pore", "oiliness", "acne", "redness", "age_spot", "heat"],
  exfoliant: ["texture", "radiance", "pore", "acne", "age_spot"],
  line_smoothing: ["wrinkle", "texture", "moisture", "dryAir"],
  toner: ["moisture", "dryAir", "flight", "oiliness", "pore", "acne", "redness", "sensitive"],
};
/** Too common or already covered by the spec bullet — only used as a last resort. */
const BASIC: IngredientId[] = ["glycerin", "uv_filters"];

function findIngredient(product: Product, target: Target, used: Set<IngredientId>) {
  const ok = (i: IngredientId) => INGREDIENTS[i].helps[target] && !used.has(i);
  return product.ingredients.find((i) => ok(i) && !BASIC.includes(i)) ?? (product.needs.includes("sunscreen") ? undefined : product.ingredients.find(ok));
}

/** Ingredient name with the brand's stated percentage, e.g. "Niacinamide 10%". */
const named = (p: Product, i: IngredientId) => {
  const c = concentrationOf(p, i);
  return c ? concLabel(c) : INGREDIENTS[i].label;
};

const scoreOf = (report: ConcernReport[], k: ConcernReport["key"]) => report.find((r) => r.key === k);

export function productReasons(product: Product, need: Need, report: ConcernReport[], climate: Climate, trip: TripContext, max = 4, skinType: SkinType | null = null): string[] {
  const f = climateFactors(climate, trip.activities);
  const out: { text: string; weight: number }[] = [];

  // 0) Skin type → texture and gentleness.
  const st = traitsOf(skinType);
  const name = skinType?.whole;
  const rich = product.texture === "rich" || product.texture === "balm";
  const light = product.texture === "gel" || product.texture === "light";
  const faceCream = ["barrier_cream", "gel_moisturizer", "hydrating_serum"].includes(need.id);
  if (name && faceCream && st.base === "dry" && rich) out.push({ text: `Your skin type is **${name}** → a **rich texture** seals moisture in`, weight: 60 });
  if (name && faceCream && st.base === "oily" && light) out.push({ text: `Your skin type is **${name}** → a **light ${product.texture}** won't feel heavy`, weight: 60 });
  if (name && faceCream && st.base === "combination" && light) out.push({ text: `Your skin type is **${name}** → **light enough for your T-zone**`, weight: 60 });
  if (name && st.redness && product.fragranceFree && (product.sensitiveFriendly || need.id === "soothing")) out.push({ text: `**Redness-prone** skin type → **fragrance-free** and gentle`, weight: 55 });
  // Cleansers: say why this kind of cleanser and not another one.
  if (need.id === "gentle_cleanser" && product.cleanserFor) {
    const scores = Object.fromEntries(report.map((r) => [r.key, r.score])) as unknown as SkinScores;
    const kind = cleanserKind({ scores, skinBase: st.base, sensitive: st.redness || (scoreOf(report, "redness")?.score ?? 100) < 45 });
    if (kind === product.cleanserFor) {
      const acne = scoreOf(report, "acne");
      const oil = [scoreOf(report, "oiliness"), scoreOf(report, "pore")].filter(Boolean).sort((a, b) => a!.score - b!.score)[0];
      const sa = concentrationOf(product, "salicylic_acid");
      if (kind === "acne" && acne)
        out.push({ text: `Your **Acne** is **${BAND_WORD[acne.band]} (${acne.score})** → a **${sa ? `${sa.pct}% salicylic acid` : "clarifying"} cleanser** instead of a plain hydrating one`, weight: 90 });
      else if (kind === "oily" && oil)
        out.push({ text: `Your **${oil.label.split(" (")[0]}** is **${BAND_WORD[oil.band]} (${oil.score})** → a **foaming gel** that lifts oil and sunscreen without stripping`, weight: 90 });
      else if (kind === "dry")
        out.push({ text: `Your skin leans **dry or reactive** → a **hydrating, non-foaming** cleanser that won't strip the barrier`, weight: 90 });
    }
  }

  // Stated strength vs skin type.
  const sensitiveSkin = st.redness || (scoreOf(report, "redness")?.score ?? 100) < 45;
  for (const c of product.concentrations ?? []) {
    const s = strengthOf(c);
    if (!s) continue;
    const usual = usualLabel(c.ingredient);
    if (s === "high" && !sensitiveSkin && (st.base === "oily" || st.base === "combination"))
      out.push({ text: `**${concLabel(c)}** is high strength (${usual}), a good match for **${skinType?.whole}**, non-reactive skin`, weight: 50 });
    else if (s !== "high" && sensitiveSkin) out.push({ text: `**${concLabel(c)}** is a moderate strength (${usual}), sensible for **reactive skin**`, weight: 50 });
  }

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
      text: `Your **${c.label.split(" (")[0]}** is **${BAND_WORD[c.band]} (${c.score})** → contains **${named(product, hit)}**, which ${info.helps[target]}`,
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
    out.push({ text: `${label} → **${named(product, hit)}** ${info.helps[target]}`, weight: level * 0.6 });
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
  if (sensitive && sensitive.band !== "strong" && product.fragranceFree && !out.some((o) => o.text.includes("fragrance-free"))) {
    out.push({ text: "**Fragrance-free**, kinder to reactive skin", weight: 20 });
  }

  return out
    .sort((a, b) => b.weight - a.weight)
    .slice(0, max)
    .map((o) => o.text);
}

/** Cautions to show with a product (e.g. retinoid + strong sun). */
export function productCautions(product: Product, climate: Climate, trip: TripContext, report: ConcernReport[] = [], skinType: SkinType | null = null): string[] {
  const f = climateFactors(climate, trip.activities);
  const out: string[] = [];
  const sensitiveSkin = traitsOf(skinType).redness || (scoreOf(report, "redness")?.score ?? 100) < 45;
  for (const c of product.concentrations ?? []) {
    if (strengthOf(c) === "high" && sensitiveSkin) out.push(`${concLabel(c)} is above the ${usualLabel(c.ingredient)}. With reactive skin, start every other day.`);
  }
  for (const i of product.ingredients) {
    const c = INGREDIENTS[i].caution;
    if (c) out.push(f.uv >= 50 ? `${c} Sun at your destination is strong (UV ${f.effectiveUv.toFixed(0)}).` : c);
  }
  if (!product.fragranceFree) out.push("Contains fragrance. Patch-test first if your skin is reactive.");
  return out;
}

/** The user's measures (not already Strong) this product can address, weakest first. */
export function productTargets(product: Product, report: ConcernReport[]): ConcernReport[] {
  const CLEANSER: Record<NonNullable<Product["cleanserFor"]>, Target[]> = {
    dry: ["moisture", "redness"],
    oily: ["oiliness", "pore"],
    acne: ["acne", "pore", "oiliness"],
  };
  const fromNeeds = product.needs.flatMap((n) => ((n === "gentle_cleanser" || n === "toner") && product.cleanserFor ? CLEANSER[product.cleanserFor] : NEED_TARGETS[n]));
  const allowed = new Set(fromNeeds);
  return report
    .filter((r) => r.band !== "strong" && allowed.has(r.key as Target) && product.ingredients.some((i) => INGREDIENTS[i].helps[r.key as Target]))
    .sort((a, b) => a.score - b.score);
}
