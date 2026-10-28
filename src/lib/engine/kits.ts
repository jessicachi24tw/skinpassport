// Turns scored needs into an Essential kit (must-pack) and a Complete kit,
// with a product option for every budget tier.

import type { BudgetTier, Kit, Need, Product, Recommendation } from "../types";
import { pickAllTiers, type PickContext, type ShopProvider } from "../shop/provider";

export async function buildKits(needs: Need[], provider: ShopProvider, ctx: PickContext): Promise<Kit[]> {
  const recs: Recommendation[] = [];
  for (const need of needs) {
    if (need.tier === "skip") continue;
    recs.push({ need, options: await pickAllTiers(provider, need, ctx) });
  }
  return [
    { id: "essential", title: "Essential kit", items: recs.filter((r) => r.need.tier === "must") },
    { id: "complete", title: "Complete kit", items: recs },
  ];
}

/**
 * Products for one budget tier. A multi-use product (e.g. a balm that covers
 * barrier cream, soothing and lips) is only listed once — later needs it
 * already covers show `coveredBy`.
 */
export function resolveKit(kit: Kit, tier: BudgetTier) {
  const seen = new Map<string, string>(); // product id -> need title
  return kit.items.map((r) => {
    const product: Product | null = r.options[tier];
    const coveredBy = product && seen.has(product.id) ? seen.get(product.id)! : null;
    if (product && !coveredBy) seen.set(product.id, r.need.title);
    return { need: r.need, product, coveredBy };
  });
}
