// Ingredient knowledge base: what each ingredient is known to help with, in
// cosmetic (not medical) language. Only ingredients verified in a product's INCI
// list are ever attached to it (see src/lib/shop/catalog.ts).

import type { IngredientId } from "../types";

/** What an ingredient helps: a skin concern, or a travel condition. */
export type Target = "moisture" | "oiliness" | "redness" | "age_spot" | "cold" | "dryAir" | "uv" | "pollution" | "heat" | "flight" | "sensitive";

export interface IngredientInfo {
  label: string;
  /** Shown as a highlighted keyword badge. */
  trending?: boolean;
  /** Short "what it does" phrase per target, written to follow "contains X, which …". */
  helps: Partial<Record<Target, string>>;
  /** Shown as a caution, not a benefit. */
  caution?: string;
}

export const INGREDIENTS: Record<IngredientId, IngredientInfo> = {
  hyaluronic_acid: {
    label: "Hyaluronic Acid",
    trending: true,
    helps: { moisture: "draws water into the skin's surface", dryAir: "holds on to water when the air is dry", flight: "re-hydrates after dry cabin air" },
  },
  ceramides: {
    label: "Ceramides",
    trending: true,
    helps: { moisture: "rebuild the skin barrier so moisture stays in", cold: "reinforce the barrier against cold, windy weather", redness: "support a stressed, reactive barrier" },
  },
  glycerin: { label: "Glycerin", helps: { moisture: "is a classic humectant that keeps skin hydrated" } },
  squalane: { label: "Squalane", trending: true, helps: { moisture: "softens dry patches without feeling greasy", cold: "adds a light protective layer in the cold" } },
  panthenol: {
    label: "Vitamin B5",
    trending: true,
    helps: { redness: "is known to soothe and comfort irritated skin", moisture: "helps the barrier recover and hold moisture" },
  },
  centella: {
    label: "Centella / Madecassoside",
    trending: true,
    helps: { redness: "is known to calm the look of redness", sensitive: "comforts sensitive, reactive skin" },
  },
  niacinamide: {
    label: "Niacinamide",
    trending: true,
    helps: { age_spot: "helps even out skin tone", oiliness: "helps balance excess oil", redness: "supports the skin barrier" },
  },
  vitamin_c: {
    label: "Vitamin C",
    trending: true,
    helps: { age_spot: "brightens and helps fade the look of dark spots", uv: "adds antioxidant support against sun stress" },
  },
  tranexamic_acid: { label: "Tranexamic Acid", trending: true, helps: { age_spot: "targets the look of stubborn discoloration" } },
  kojic_acid: { label: "Kojic Acid", helps: { age_spot: "helps brighten uneven-looking tone" } },
  melasyl: {
    label: "Melasyl™",
    trending: true,
    helps: { age_spot: "is L'Oréal's patented molecule designed to target the look of dark spots" },
  },
  vitamin_e: { label: "Vitamin E", helps: { uv: "adds antioxidant protection", pollution: "helps defend against pollution stress" } },
  ferulic_acid: { label: "Ferulic Acid", helps: { uv: "boosts the antioxidant power of vitamins C and E" } },
  shea_butter: { label: "Shea Butter", helps: { cold: "seals in moisture against cold wind", moisture: "nourishes very dry skin and lips" } },
  petrolatum: { label: "Petrolatum", helps: { cold: "forms a protective seal in harsh, cold air", moisture: "locks moisture in overnight" } },
  cholesterol: { label: "Cholesterol", helps: { moisture: "is a key barrier lipid alongside ceramides" } },
  glacial_glycoprotein: {
    label: "Glacial Glycoprotein",
    helps: { moisture: "is Kiehl's ingredient for long-lasting hydration", cold: "is used by Kiehl's for comfort in harsh climates" },
  },
  peptides: { label: "Peptides", trending: true, helps: { moisture: "support smoother, plumper-looking skin" } },
  salicylic_acid: { label: "Salicylic Acid (BHA)", helps: { oiliness: "gently keeps pores clear", heat: "helps prevent sweat-clogged pores" } },
  lha: { label: "LHA", helps: { oiliness: "gently exfoliates for smoother texture", age_spot: "helps renew dull-looking skin" } },
  retinoid: {
    label: "Retinoid",
    helps: { age_spot: "supports skin renewal for a more even look" },
    caution: "Contains a retinoid: use at night and wear sunscreen daily.",
  },
  zinc_oxide: { label: "Zinc Oxide (mineral SPF)", trending: true, helps: { uv: "is a mineral filter that blocks UVA and UVB", sensitive: "is a gentle choice for reactive skin" } },
  uv_filters: { label: "Broad-spectrum UV filters", helps: { uv: "protect against UVA and UVB" } },
  cucumber: { label: "Cucumber Extract", helps: { redness: "is a soothing botanical that cools the look of redness" } },
  aloe: { label: "Aloe Vera", helps: { uv: "cools and soothes skin after sun", heat: "feels cooling in the heat" } },
  thermal_water: { label: "Thermal Spring Water", helps: { flight: "refreshes skin on long trips", sensitive: "is fragrance-free and gentle" } },
  bisabolol: { label: "Bisabolol", helps: { redness: "is known for its soothing properties" } },
};

export const trendingOf = (ids: IngredientId[]) => ids.filter((i) => INGREDIENTS[i].trending).map((i) => INGREDIENTS[i].label);
