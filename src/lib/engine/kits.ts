// Turns scored needs into an Essential kit (must-pack) and a Complete kit.

import type { Kit, Need, Recommendation } from "../types";
import type { PickContext, ShopProvider } from "../shop/provider";

export async function buildKits(needs: Need[], provider: ShopProvider, ctx: PickContext): Promise<Kit[]> {
  const recs: Recommendation[] = [];
  const used = new Set<string>();
  for (const need of needs) {
    if (need.tier === "skip") continue;
    const product = await provider.pick(need, ctx);
    // A multi-use product (e.g. a balm) should only be counted once.
    if (product && used.has(product.id)) continue;
    if (product) used.add(product.id);
    recs.push({ need, product });
  }
  const subtotal = (items: Recommendation[]) => Math.round(items.reduce((t, r) => t + (r.product?.estPriceUsd ?? 0), 0));
  const essential = recs.filter((r) => r.need.tier === "must");
  const complete = recs.filter((r) => r.need.tier !== "skip");
  return [
    { id: "essential", title: "Essential kit", items: essential, subtotalUsd: subtotal(essential) },
    { id: "complete", title: "Complete kit", items: complete, subtotalUsd: subtotal(complete) },
  ];
}
