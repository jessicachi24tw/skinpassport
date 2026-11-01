// YouCam skin type (whole face, T-zone, U-zone) and how it changes the plan:
// 1) product texture (rich vs gel), 2) zone advice for combination skin,
// 3) gentle care first for "Redness" types, 4) wording for summary, reasons and the passport.

import type { SkinScores, SkinType, SkinTypeLabel } from "../types";

export const SKIN_TYPE_LABELS: SkinTypeLabel[] = ["Combination & Redness", "Oily & Redness", "Dry & Redness", "Combination", "Normal", "Oily", "Dry", "Redness"];

export interface SkinTraits {
  base: "normal" | "oily" | "dry" | "combination" | null;
  redness: boolean;
}

export function traitsOf(t?: SkinType | null): SkinTraits {
  const w = t?.whole ?? null;
  if (!w) return { base: null, redness: false };
  const base = w.startsWith("Combination") ? "combination" : w.startsWith("Oily") ? "oily" : w.startsWith("Dry") ? "dry" : w === "Normal" ? "normal" : null;
  return { base, redness: w.includes("Redness") };
}

const zoneWord = (l?: SkinTypeLabel | null) => (l ? l.split(" & ")[0].toLowerCase() : null);

/** "Combination & Redness (T-zone oily, cheeks dry)" */
export function describeSkinType(t?: SkinType | null): string | null {
  if (!t?.whole) return null;
  const tz = zoneWord(t.tZone);
  const uz = zoneWord(t.uZone);
  const zones = tz && uz && tz !== uz ? ` (T-zone ${tz}, cheeks ${uz})` : "";
  return `${t.whole}${zones}`;
}

/** Zone advice for combination skin, or null. */
export function zoneTip(t?: SkinType | null): string | null {
  const tr = traitsOf(t);
  const tz = zoneWord(t?.tZone);
  const uz = zoneWord(t?.uZone);
  if (tr.base !== "combination" && !(tz && uz && tz !== uz)) return null;
  return "Light gel on the **T-zone**, richer cream on the **cheeks**";
}

/** Which cleanser suits this skin: acne first, then oil/pores, otherwise hydrating. */
export function cleanserKind(ctx: { scores?: SkinScores; skinBase?: SkinTraits["base"]; sensitive: boolean }): "acne" | "oily" | "dry" {
  const s = ctx.scores;
  if (s && (s.acne ?? 100) < 60 && !(ctx.sensitive && (s.acne ?? 100) >= 50)) return "acne";
  if (ctx.skinBase === "oily" || (s && (s.oiliness < 55 || (s.pore ?? 100) < 55))) return "oily";
  return "dry";
}
