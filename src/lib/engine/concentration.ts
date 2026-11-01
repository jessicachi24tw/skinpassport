// Stated concentrations: only percentages the brand itself states are used (nothing estimated).
// Each active has a commonly used range; above it is "high strength". Higher is not always
// better: sensitive or redness-prone skin and sunny trips favour gentler strengths.
//
// Ranges: salicylic acid 0.5–2% and benzoyl peroxide 2.5–10% are the US OTC acne monograph
// limits (we treat >5% BP as high for travel skin); glycolic acid ≤10% is the CIR consumer limit;
// niacinamide 2–5%, retinol 0.1–0.3% and L-ascorbic acid 10–20% are the ranges most cited for
// everyday cosmetic use.

import type { IngredientId, Product, StatedConcentration } from "../types";
import { INGREDIENTS } from "./ingredients";

export const USUAL: Partial<Record<IngredientId, [number, number]>> = {
  niacinamide: [2, 5],
  salicylic_acid: [0.5, 2],
  benzoyl_peroxide: [2.5, 5],
  glycolic_acid: [5, 10],
  retinoid: [0.1, 0.3],
  vitamin_c: [10, 20],
};

export type Strength = "gentle" | "standard" | "high";

export function strengthOf(c: StatedConcentration): Strength | null {
  const r = USUAL[c.ingredient];
  if (!r) return null;
  return c.pct < r[0] ? "gentle" : c.pct > r[1] ? "high" : "standard";
}

/** Strongest stated active in the product (for ranking). */
export function productStrength(p: Product): Strength | null {
  const order: Strength[] = ["gentle", "standard", "high"];
  let best: Strength | null = null;
  for (const c of p.concentrations ?? []) {
    const s = strengthOf(c);
    if (s && (!best || order.indexOf(s) > order.indexOf(best))) best = s;
  }
  return best;
}

export const concentrationOf = (p: Product, i: IngredientId) => p.concentrations?.find((c) => c.ingredient === i);

const fmtPct = (n: number) => `${Number.isInteger(n) ? n : n.toString()}%`;

/** "Niacinamide 10%" or "Matrixyl peptides 10%". */
export const concLabel = (c: StatedConcentration) => `${c.label ?? INGREDIENTS[c.ingredient].label} ${fmtPct(c.pct)}`;

/** "usual 2–5%" for the strength meter. */
export const usualLabel = (i: IngredientId) => {
  const r = USUAL[i];
  return r ? `usual ${r[0]}–${r[1]}%` : null;
};

/**
 * Ranking bonus from strength × skin. Sensitive skin: high −3, gentle +1.
 * Oily, not sensitive, for pore/blemish care: high +1.5. Strong sun: high −2.
 */
export function strengthFit(p: Product, ctx: { sensitive: boolean; oily: boolean; strongSun: boolean; targeted: boolean }) {
  const s = productStrength(p);
  if (!s) return 0;
  let v = 0;
  if (ctx.sensitive) v += s === "high" ? -3 : s === "gentle" ? 1 : 0;
  else if (ctx.oily && ctx.targeted && s === "high") v += 1.5;
  if (ctx.strongSun && s === "high") v -= 2;
  return v;
}
