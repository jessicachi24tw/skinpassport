// Turns scored needs into one list of recommendations, with a product option for
// every budget tier and a check of what the user already owns.

import type { Need, OwnedProduct, Recommendation } from "../types";
import { pickAllTiers, type PickContext, type ShopProvider } from "../shop/provider";
import { sunscreenSpec } from "./necessity";

/** Does an owned product meet this trip's requirement for the need? */
export function checkOwned(p: OwnedProduct, need: Need, ctx: PickContext): { meetsSpec: boolean; note?: string } {
  if (need.id !== "sunscreen") return { meetsSpec: true };
  const spec = sunscreenSpec(ctx.effectiveUv, ctx.activities);
  if (p.spf == null) return { meetsSpec: true, note: `Check yours is ${spec.label}` };
  if (p.spf < spec.minSpf) return { meetsSpec: false, note: `Yours is SPF ${p.spf} — this trip needs ${spec.label}` };
  if (spec.waterResistant && p.waterResistant === false) return { meetsSpec: false, note: "Yours isn't water-resistant — this trip needs it" };
  return { meetsSpec: true, note: `SPF ${p.spf} meets ${spec.label}` };
}

export async function buildRecommendations(needs: Need[], provider: ShopProvider, ctx: PickContext, owned: OwnedProduct[] = []): Promise<Recommendation[]> {
  const out: Recommendation[] = [];
  for (const need of needs) {
    if (need.tier === "skip") continue;
    out.push({
      need,
      options: await pickAllTiers(provider, need, ctx),
      owned: owned.filter((o) => o.needs.includes(need.id)).map((product) => ({ product, ...checkOwned(product, need, ctx) })),
    });
  }
  return out;
}

/**
 * Products for one budget tier. A multi-use product (e.g. a balm that covers
 * barrier cream, soothing and lips) is only listed once — later needs it
 * already covers show `coveredBy`.
 */
export function resolveTier(items: Recommendation[], tier: "value" | "balanced" | "premium") {
  const seen = new Map<string, string>(); // product id -> need title
  return items.map((r) => {
    const product = r.options[tier];
    const coveredBy = product && seen.has(product.id) ? seen.get(product.id)! : null;
    if (product && !coveredBy) seen.set(product.id, r.need.title);
    return { ...r, product, coveredBy };
  });
}
