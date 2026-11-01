// Brand → product presets for "Add your shelf" (two dropdowns, like country → city).
// Everything in our catalog, plus well-known products people often already own.
// "Other…" in either dropdown still lets the user type any brand or product.

import { fromCatalog } from "../shelf";
import type { NeedId, OwnedProduct } from "../types";
import { CATALOG } from "./catalog";

type Extra = [brand: string, name: string, needs: NeedId[], more?: Partial<OwnedProduct>];

const EXTRAS: Extra[] = [
  ["Avène", "Thermal Spring Water", ["face_mist"]],
  ["Avène", "Cicalfate+ Restorative Protective Cream", ["barrier_cream", "soothing"]],
  ["Bioderma", "Sensibio H2O Micellar Water", ["gentle_cleanser"]],
  ["Cetaphil", "Gentle Skin Cleanser", ["gentle_cleanser"]],
  ["Cetaphil", "Moisturizing Cream", ["barrier_cream"]],
  ["Clinique", "Moisture Surge 100H Auto-Replenishing Hydrator", ["gel_moisturizer"]],
  ["Clinique", "Dramatically Different Moisturizing Lotion+", ["barrier_cream"]],
  ["Clinique", "Clarifying Lotion", ["toner"]],
  ["Drunk Elephant", "Protini Polypeptide Cream", ["barrier_cream"]],
  ["Drunk Elephant", "C-Firma Fresh Day Serum", ["brightening"]],
  ["EltaMD", "UV Clear Broad-Spectrum SPF 46", ["sunscreen"], { spf: 46 }],
  ["Estée Lauder", "Advanced Night Repair Synchronized Multi-Recovery Complex", ["hydrating_serum"]],
  ["Eucerin", "Advanced Repair Cream", ["barrier_cream"]],
  ["First Aid Beauty", "Ultra Repair Cream", ["barrier_cream", "soothing"]],
  ["Laneige", "Lip Sleeping Mask", ["lip_care"]],
  ["Shiseido", "Ultimate Sun Protector Lotion SPF 50+", ["sunscreen"], { spf: 50, waterResistant: true }],
  ["Supergoop!", "Unseen Sunscreen SPF 40", ["sunscreen"], { spf: 40 }],
  ["Tatcha", "The Water Cream", ["gel_moisturizer"]],
  ["Tatcha", "The Dewy Skin Cream", ["barrier_cream"]],
  ["The Ordinary", "Hyaluronic Acid 2% + B5", ["hydrating_serum"]],
  ["The Ordinary", "Glycolic Acid 7% Exfoliating Toner", [], { treatment: true, photosensitizing: true }],
  ["The Ordinary", "Retinol 0.5% in Squalane", [], { treatment: true, photosensitizing: true }],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const fromExtra = ([brand, name, needs, more]: Extra): OwnedProduct => ({
  id: `preset-${slug(`${brand} ${name}`)}`,
  brand,
  name,
  needs,
  source: "manual",
  ...more,
});

export const SHELF_PRESETS: OwnedProduct[] = [...CATALOG.map(fromCatalog), ...EXTRAS.map(fromExtra)];

const byName = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });

/** Brands, A–Z. */
export const SHELF_BRANDS: string[] = [...new Set(SHELF_PRESETS.map((p) => p.brand))].sort(byName);

/** A brand's products, A–Z. */
export const shelfProductsOf = (brand: string) => SHELF_PRESETS.filter((p) => p.brand === brand).sort((a, b) => byName(a.name, b.name));
