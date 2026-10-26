// Shop provider interface. The MVP uses the local catalog.
// To plug in a real store (e.g. Shopify Storefront API or Amazon Creators API),
// implement `ShopProvider` and return it from `getShopProvider()`.

import type { Need, Product } from "../types";
import { sunscreenSpec } from "../engine/necessity";
import { CATALOG } from "./catalog";

export interface PickContext {
  sensitive: boolean;
  effectiveUv: number;
  activity: Parameters<typeof sunscreenSpec>[1];
}

export interface ShopProvider {
  name: string;
  pick(need: Need, ctx: PickContext): Promise<Product | null>;
}

/** Score how well a product fits a need. Higher is better; -1 = not allowed. */
export function fitScore(p: Product, need: Need, ctx: PickContext): number {
  if (!p.needs.includes(need.id)) return -1;
  let s = 10;
  if (need.id === "sunscreen") {
    const spec = sunscreenSpec(ctx.effectiveUv, ctx.activity);
    if ((p.spf ?? 0) < spec.minSpf) return -1;
    if (spec.waterResistant) s += p.waterResistant ? 6 : -4;
    const extra = (p.spf ?? 0) - spec.minSpf;
    // Strong sun: higher SPF is a plus. Mild sun: avoid paying for overkill.
    s += spec.minSpf >= 50 ? Math.min(2, extra / 5) : -extra / 15;
  }
  if (ctx.sensitive && p.sensitiveFriendly) s += 3;
  if (p.needs[0] === need.id) s += 2; // primary purpose beats multi-use
  s -= p.estPriceUsd / 50; // gentle preference for cheaper items
  return s;
}

export const catalogProvider: ShopProvider = {
  name: "local-catalog",
  async pick(need, ctx) {
    let best: Product | null = null;
    let bestScore = -1;
    for (const p of CATALOG) {
      const s = fitScore(p, need, ctx);
      if (s > bestScore) {
        best = p;
        bestScore = s;
      }
    }
    return best;
  },
};

export function getShopProvider(): ShopProvider {
  return catalogProvider;
}
