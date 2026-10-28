// Helpers for Step 3 ("My shelf"): guess what an owned product is from its name
// (and ingredient list, when Open Beauty Facts has one).

import type { NeedId, OwnedProduct, Product } from "./types";

const RULES: [RegExp, NeedId[]][] = [
  [/after[\s-]?sun|aloe/i, ["after_sun"]],
  [/\bspf\b|sunscreen|sun screen|\buv\b|anthelios|sun protector|sunblock/i, ["sunscreen"]],
  [/cleans|face wash|foaming|micellar/i, ["gentle_cleanser"]],
  [/\blip/i, ["lip_care"]],
  [/mist|thermal (spring )?water|facial spray|spring water/i, ["face_mist"]],
  [/vitamin c|brighten|dark spot|mela\b|melasyl|discoloration|tranexamic|ferulic/i, ["brightening"]],
  [/cica|calm|sooth|baume|redness/i, ["soothing", "barrier_cream"]],
  [/serum|booster|essence|ampoule|hyaluronic/i, ["hydrating_serum"]],
  [/gel[\s-]?cream|water gel|jelly|oil[\s-]?free gel/i, ["gel_moisturizer"]],
  [/cream|moistur|lotion|balm|ointment/i, ["barrier_cream"]],
];

export function guessNeeds(name: string): NeedId[] {
  // Retinoids and acids are treatments, not one of the trip categories.
  if (isPhotosensitizing(name) && !/\bspf\b|sunscreen|cleans/i.test(name)) return [];
  for (const [re, needs] of RULES) if (re.test(name)) return needs;
  return [];
}

export const parseSpf = (text: string) => {
  const m = /spf\s*(\d{2})/i.exec(text);
  return m ? Number(m[1]) : undefined;
};

/** Retinoids and exfoliating acids make skin more sun-sensitive. */
export function isPhotosensitizing(text: string) {
  return /retin|glycolic|lactic acid|mandelic|\baha\b|peel|resurfac/i.test(text);
}

export function fromCatalog(p: Product): OwnedProduct {
  return {
    id: `cat-${p.id}`,
    name: p.name,
    brand: p.brand,
    needs: p.needs,
    spf: p.spf,
    waterResistant: p.waterResistant,
    ingredients: p.ingredients,
    photosensitizing: p.ingredients.includes("retinoid"),
    source: "catalog",
    catalogId: p.id,
  };
}

export function fromText(name: string, brand: string, extra = "", source: OwnedProduct["source"] = "manual", id?: string): OwnedProduct {
  const text = `${brand} ${name}`;
  const needs = guessNeeds(text);
  return {
    id: id ?? `${source}-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}`,
    name,
    brand,
    needs,
    spf: parseSpf(text),
    waterResistant: /water[\s-]?resistant/i.test(text) ? true : undefined,
    photosensitizing: isPhotosensitizing(`${text} ${extra}`),
    treatment: !needs.length && isPhotosensitizing(text) ? true : undefined,
    source,
  };
}
