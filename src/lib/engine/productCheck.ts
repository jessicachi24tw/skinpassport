// "Check a product": evaluate any product the user wants against their saved plan.
// Verdicts: swap_in (fits as well as or better than our pick), add (fills a type the bag lacks),
// not_for_trip (fails the trip's spec or clashes with skin/sun), not_needed (type not needed now).

import type { BudgetTier, Climate, ConcernReport, NeedId, PlanResult, Product, SkinScores, SkinType, TripContext } from "../types";
import { climateFactors, concernLevels, NEED_TITLES, sunscreenSpec } from "./necessity";
import { guessTexture, guessTypes, parseInci, parseSpf, statedPercentages } from "./inci";
import { productStrength } from "./concentration";
import { resolveTier } from "./recommend";
import { productCautions, productReasons, productTargets } from "./reasons";
import { traitsOf } from "./skinType";
import { fitScore } from "../shop/provider";

export interface FoundProduct {
  source: "catalog" | "openbeautyfacts" | "web" | "pasted";
  brand: string;
  name: string;
  ingredientsText: string;
  sourceUrl: string;
  claims?: string;
  priceUsd?: number;
}

/** Turn a lookup result into a Product the engine can score. */
export function productFromFound(f: FoundProduct, type?: NeedId): { product: Product; types: NeedId[]; fragrance: boolean; alcohol: boolean } {
  const text = `${f.brand} ${f.name}`;
  const parsed = parseInci(f.ingredientsText);
  const claims = `${f.name} ${f.claims ?? ""}`;
  const types = guessTypes(text, parsed.ingredients);
  const chosen = type ?? types[0] ?? "hydrating_serum";
  const strong = parsed.ingredients.some((i) => ["retinoid", "glycolic_acid", "benzoyl_peroxide"].includes(i));
  const product: Product = {
    id: `check-${(f.brand + "-" + f.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 70)}`,
    brand: f.brand || "Unknown brand",
    loreal: false,
    name: f.name,
    tier: "balanced",
    needs: [chosen],
    estPriceUsd: f.priceUsd ?? 0,
    spf: parseSpf(claims),
    waterResistant: /water[\s-]?resistant/i.test(claims) ? true : undefined,
    fragranceFree: !parsed.fragrance,
    sensitiveFriendly: !parsed.fragrance && !parsed.alcohol && !strong,
    texture: guessTexture(f.name),
    when: strong ? "pm" : "both",
    tagline: "",
    description: "",
    ingredients: parsed.ingredients,
    concentrations: statedPercentages(claims),
    ingredientSource: f.sourceUrl,
    howToUse: "",
    url: f.sourceUrl,
    image: null,
  };
  return { product, types: types.length ? types : [chosen], fragrance: parsed.fragrance, alcohol: parsed.alcohol };
}

export type Verdict = "swap_in" | "add" | "not_for_trip" | "not_needed";

export interface CheckResult {
  verdict: Verdict;
  headline: string;
  need: { id: NeedId; title: string; score: number; tier: string };
  ours: Product | null;
  yours: { reasons: string[]; cautions: string[]; targets: ConcernReport[]; fit: number };
  oursInfo: { reasons: string[]; targets: ConcernReport[]; fit: number } | null;
  blockers: string[];
}

export function checkProduct(args: {
  product: Product;
  plan: PlanResult;
  budget: BudgetTier;
  climate: Climate;
  trip: TripContext;
  scores: SkinScores;
  skinType: SkinType | null;
  bag: string[];
  ownedNeeds: NeedId[];
  preferredBrands: string[];
}): CheckResult {
  const { product, plan, budget, climate, trip, scores, skinType } = args;
  const type = product.needs[0];
  const need = plan.needs.find((n) => n.id === type) ?? { id: type, title: NEED_TITLES[type], score: 0, tier: "skip" as const, stars: 1, reasons: [] };
  const st = traitsOf(skinType);
  const f = climateFactors(climate, trip.activities);
  const ctx = {
    sensitive: concernLevels(scores).sensitivity >= 40 || st.redness,
    effectiveUv: f.effectiveUv,
    activities: trip.activities,
    preferredBrands: args.preferredBrands,
    skinBase: st.base,
    scores,
  };
  const item = resolveTier(plan.items, budget).find((i) => i.need.id === type);
  const ours = item?.product && item.product.id !== product.id ? item.product : null;

  const fitYours = fitScore(product, need, ctx);
  const fitOurs = ours ? fitScore(ours, need, ctx) : -1;
  const yours = {
    reasons: productReasons(product, need, plan.report, climate, trip, 4, skinType),
    cautions: productCautions(product, climate, trip, plan.report, skinType),
    targets: productTargets(product, plan.report),
    fit: fitYours,
  };
  const oursInfo = ours ? { reasons: productReasons(ours, need, plan.report, climate, trip, 3, skinType), targets: productTargets(ours, plan.report), fit: fitOurs } : null;

  // Hard reasons it doesn't suit this trip.
  const blockers: string[] = [];
  if (type === "sunscreen") {
    const spec = sunscreenSpec(f.effectiveUv, trip.activities);
    if (!product.spf) blockers.push(`No SPF found on the label. This trip needs ${spec.label}.`);
    else if (product.spf < spec.minSpf) blockers.push(`SPF ${product.spf} is too low: this trip needs ${spec.label}.`);
    if (spec.waterResistant && !product.waterResistant) blockers.push("This trip needs a water-resistant sunscreen.");
  }
  if (f.effectiveUv >= 6 && product.ingredients.includes("retinoid")) blockers.push(`Retinoids make skin more sun-sensitive, and UV reaches ${f.effectiveUv.toFixed(0)} on this trip. Use it at home instead.`);
  if (ctx.sensitive && productStrength(product) === "high" && !product.fragranceFree) blockers.push("High strength plus fragrance is a lot for reactive skin.");

  const inBagSameType = args.bag.some((id) => id === ours?.id);
  let verdict: Verdict;
  let headline: string;
  if (blockers.length) {
    verdict = "not_for_trip";
    headline = ours ? `Skip it for this trip: ${ours.brand} ${ours.name.replace(/ with .*$/i, "")} fits better` : "Skip it for this trip";
  } else if (need.tier === "skip") {
    verdict = "not_needed";
    headline = type === "brightening" && trip.daysUntil != null && trip.daysUntil < 21 ? "Save it for after the trip" : "Not needed for this trip";
  } else if (ours && fitYours >= fitOurs - 1) {
    verdict = "swap_in";
    headline = fitYours > fitOurs + 0.5 ? `A better fit than our pick` : `As good a fit as our pick`;
  } else if (!inBagSameType && !args.ownedNeeds.includes(type)) {
    verdict = "add";
    headline = ours ? `Works, though our pick fits a bit better` : `Fills your ${need.title.toLowerCase()} slot`;
  } else {
    verdict = "add";
    headline = "Our pick fits better, but this works too";
  }
  return { verdict, headline, need: { id: need.id, title: need.title, score: need.score, tier: need.tier }, ours, yours, oursInfo, blockers };
}
