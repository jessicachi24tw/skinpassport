// Product catalog — L'Oréal Groupe brands first, a few others where L'Oréal has no fit.
//
// Every `ingredients` entry was checked against the product's published INCI list
// (source in `ingredientSource`, October 2026). Claims are the brand's own
// (water resistance, %), checked on retailer pages. Descriptions are our own words.
// Prices are rough US estimates for the demo — check the retailer.
// `obf` is the search query scripts/setup-assets.mjs uses to find a photo on Open Beauty Facts.

import type { BudgetTier, Product } from "../types";
import IMAGES from "./product-images.json";

const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG;

/** Retailer search link. Adds your Amazon Associates tag when configured. */
export function searchUrl(query: string) {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
  return AMAZON_TAG ? `${base}&tag=${encodeURIComponent(AMAZON_TAG)}` : base;
}

const SS = "https://skinsort.com/products/";

export type Seed = Omit<Product, "url" | "image"> & { obf: string };

export const SEEDS: Seed[] = [
  // ---------- Sunscreen ----------
  {
    id: "cerave-am-30", brand: "CeraVe", loreal: true, name: "AM Facial Moisturizing Lotion SPF 30", tier: "value", needs: ["sunscreen"], estPriceUsd: 19, spf: 30, waterResistant: false, sensitiveFriendly: true, fragranceFree: true, texture: "light", when: "am",
    tagline: "Moisturizer and daily SPF 30 in one step",
    description: "A morning moisturizer with broad-spectrum SPF 30 plus ceramides and niacinamide. Enough for city days when UV is low to moderate.",
    ingredients: ["uv_filters", "niacinamide", "ceramides", "hyaluronic_acid", "glycerin", "vitamin_e"],
    ingredientSource: `${SS}cerave/am-facial-moisturising-lotion-spf30`,
    howToUse: "Apply every morning as the last skincare step. Reapply every 2 hours outdoors.",
    obf: "cerave am facial moisturizing lotion spf 30",
  },
  {
    id: "neutrogena-ultra-sheer-55", brand: "Neutrogena", loreal: false, name: "Ultra Sheer Dry-Touch Sunscreen SPF 55", tier: "value", needs: ["sunscreen"], estPriceUsd: 11, spf: 55, waterResistant: true, fragranceFree: false, texture: "light", when: "am",
    tagline: "Budget-friendly, water-resistant (80 min) high SPF",
    description: "A lightweight, non-greasy lotion labelled water-resistant for 80 minutes. A budget pick for beach and outdoor days.",
    ingredients: ["uv_filters", "vitamin_e"],
    ingredientSource: "https://skinsort.com/compare/neutrogena-neutrogena-ultra-sheer-dry-touch-sunscreen-broad-spectrum-spf-55-vs-sunsense-daily-face-spf-50",
    howToUse: "Apply generously 15 minutes before sun. Reapply after 80 minutes of swimming or sweating and at least every 2 hours.",
    obf: "neutrogena ultra sheer dry-touch spf 55",
  },
  {
    id: "lrp-anthelios-60", brand: "La Roche-Posay", loreal: true, name: "Anthelios Melt-in Milk Sunscreen SPF 60", tier: "balanced", needs: ["sunscreen"], estPriceUsd: 38, spf: 60, waterResistant: true, sensitiveFriendly: true, fragranceFree: true, texture: "light", when: "am",
    tagline: "High protection that lasts through water and sweat (80 min)",
    description: "A broad-spectrum SPF 60 lotion for face and body, water-resistant for 80 minutes, with La Roche-Posay's Cell-Ox Shield antioxidant technology. Tested on sensitive skin.",
    ingredients: ["uv_filters", "vitamin_e", "glycerin"],
    ingredientSource: `${SS}la-roche-posay/anthelios-melt-in-milk-sunscreen-spf-60`,
    howToUse: "Apply generously 15 minutes before sun exposure. Reapply after 80 minutes of swimming or sweating, and at least every 2 hours.",
    obf: "la roche-posay anthelios melt-in milk spf 60",
  },
  {
    id: "skinceuticals-physical-fusion-50", brand: "SkinCeuticals", loreal: true, name: "Physical Fusion UV Defense SPF 50", tier: "premium", needs: ["sunscreen"], estPriceUsd: 45, spf: 50, waterResistant: true, sensitiveFriendly: true, fragranceFree: true, texture: "light", when: "am",
    tagline: "Tinted mineral SPF 50, gentle on reactive skin",
    description: "A sheer, universally tinted mineral sunscreen with 5% zinc oxide and 6% titanium dioxide, water-resistant for 40 minutes. A premium pick for sensitive skin under strong sun.",
    ingredients: ["zinc_oxide", "uv_filters"],
    ingredientSource: "https://www.dermstore.com/p/skinceuticals-physical-fusion-uv-defense-spf50-sunscreen-various-sizes/12941160/",
    howToUse: "Shake well and apply as the last step in the morning. Reapply after 40 minutes of swimming or sweating.",
    obf: "skinceuticals physical fusion uv defense",
  },

  // ---------- Barrier cream ----------
  {
    id: "cerave-cream", brand: "CeraVe", loreal: true, name: "Moisturizing Cream", tier: "value", needs: ["barrier_cream"], estPriceUsd: 19, sensitiveFriendly: true, fragranceFree: true, texture: "rich", when: "both",
    tagline: "Rich, fragrance-free cream with three essential ceramides",
    description: "A thick, non-greasy cream with ceramides, hyaluronic acid and petrolatum to rebuild the barrier when cold, dry air pulls moisture out.",
    ingredients: ["ceramides", "hyaluronic_acid", "petrolatum", "glycerin", "vitamin_e"],
    ingredientSource: `${SS}cerave/moisturizing-cream`,
    howToUse: "Apply morning and night to face and body, or as a thicker layer at night in cold, dry places.",
    obf: "cerave moisturizing cream",
  },
  {
    id: "lrp-cicaplast", brand: "La Roche-Posay", loreal: true, name: "Cicaplast Baume B5+", tier: "value", needs: ["barrier_cream", "soothing", "lip_care"], estPriceUsd: 17, sensitiveFriendly: true, fragranceFree: true, texture: "balm", when: "pm",
    tagline: "Multi-purpose soothing balm: one tube, many jobs",
    description: "A soothing balm with panthenol and madecassoside for dry, irritated or chapped skin. Works as a night barrier cream, a rescue balm for redness and a lip treatment. Great for packing light.",
    ingredients: ["panthenol", "centella", "shea_butter", "glycerin"],
    ingredientSource: `${SS}la-roche-posay/cicaplast-baume-b5`,
    howToUse: "Apply a thin layer to dry or irritated areas twice a day, or as the last step of your night routine.",
    obf: "la roche-posay cicaplast baume b5",
  },
  {
    id: "kiehls-ufc", brand: "Kiehl's", loreal: true, name: "Ultra Facial Cream with Squalane", tier: "balanced", needs: ["barrier_cream"], estPriceUsd: 39, texture: "rich", fragranceFree: true, when: "both",
    tagline: "Kiehl's #1 daily cream for long-lasting hydration",
    description: "A lightweight, non-greasy daily cream. Kiehl's formulates it with 4.5% squalane, Glacial Glycoprotein and Pro-Ceramides, and says it is clinically shown to hydrate 15 layers deep.",
    ingredients: ["squalane", "glacial_glycoprotein", "glycerin", "vitamin_e"],
    ingredientSource: `${SS}kiehl-s/ultra-facial-cream`,
    howToUse: "Smooth onto clean skin morning and night.",
    obf: "kiehl's ultra facial cream",
  },
  {
    id: "skinceuticals-triple-lipid", brand: "SkinCeuticals", loreal: true, name: "Triple Lipid Restore 2:4:2", tier: "premium", needs: ["barrier_cream"], estPriceUsd: 150, texture: "rich", fragranceFree: false, when: "both",
    tagline: "Ceramides + cholesterol to replenish barrier lipids",
    description: "A rich cream built on the skin's own barrier lipids (ceramides and cholesterol) for very dry, weakened skin on cold or long-haul trips.",
    ingredients: ["ceramides", "cholesterol", "glycerin", "vitamin_e"],
    ingredientSource: `${SS}skinceuticals/triple-lipid-restore-2-4-2`,
    howToUse: "Apply 3–5 pumps to face and neck morning and/or night after serum.",
    obf: "skinceuticals triple lipid restore",
  },

  // ---------- Hydrating serum ----------
  {
    id: "loreal-revitalift-ha", brand: "L'Oréal Paris", loreal: true, name: "Revitalift 1.5% Pure Hyaluronic Acid Serum", concentrations: [{ ingredient: "hyaluronic_acid", pct: 1.5 }], tier: "value", needs: ["hydrating_serum"], estPriceUsd: 30, fragranceFree: true, texture: "light", when: "both",
    tagline: "1.5% hyaluronic acid for plumper, hydrated skin",
    description: "A fragrance-free serum with 1.5% hyaluronic acid, plus a vitamin C derivative and a peptide, to re-plump dehydrated skin before and after travel.",
    ingredients: ["hyaluronic_acid", "glycerin", "vitamin_c", "peptides", "panthenol"],
    ingredientSource: `${SS}l-oreal/revitalift-derm-intensives-hyaluronic-acid-serum`,
    howToUse: "Apply 3 drops to clean skin morning and night, then moisturizer.",
    obf: "l'oreal revitalift hyaluronic acid serum",
  },
  {
    id: "vichy-mineral-89", brand: "Vichy", loreal: true, name: "Minéral 89 Hyaluronic Acid Booster", tier: "balanced", needs: ["hydrating_serum"], estPriceUsd: 33, sensitiveFriendly: true, fragranceFree: true, texture: "gel", when: "both",
    tagline: "Daily hydrating and strengthening booster",
    description: "A short, fragrance-free gel booster built around hyaluronic acid for daily hydration. A simple first step for dehydrated skin.",
    ingredients: ["hyaluronic_acid", "glycerin"],
    ingredientSource: `${SS}vichy/mineral-89-hyaluronic-acid-booster`,
    howToUse: "Apply morning and night before moisturizer.",
    obf: "vichy mineral 89",
  },
  {
    id: "skinceuticals-hydrating-b5", brand: "SkinCeuticals", loreal: true, name: "Hydrating B5 Gel", tier: "premium", needs: ["hydrating_serum"], estPriceUsd: 90, sensitiveFriendly: true, fragranceFree: true, texture: "gel", when: "both",
    tagline: "Minimalist hyaluronic acid + vitamin B5 gel",
    description: "A four-ingredient, fragrance-free gel with hyaluronic acid and a vitamin B5 source to replenish moisture without heaviness.",
    ingredients: ["hyaluronic_acid", "panthenol"],
    ingredientSource: `${SS}skinceuticals/hydrating-b5-gel`,
    howToUse: "Apply 4–5 drops morning and night before moisturizer.",
    obf: "skinceuticals hydrating b5",
  },

  // ---------- Gel moisturizer ----------
  {
    id: "neutrogena-hydro-boost", brand: "Neutrogena", loreal: false, name: "Hydro Boost Water Gel", tier: "value", needs: ["gel_moisturizer"], estPriceUsd: 20, fragranceFree: false, texture: "gel", when: "both",
    tagline: "Oil-free water gel that hydrates without heaviness",
    description: "A refreshing, oil-free water-gel with hyaluronic acid for hot, humid weather.",
    ingredients: ["hyaluronic_acid", "glycerin", "vitamin_e"],
    ingredientSource: `${SS}neutrogena/hydro-boost-water-gel-61d6d386-1d43-475e-8eaa-49fe79b08674`,
    howToUse: "Apply morning and night. In heat, use it instead of a rich cream during the day.",
    obf: "neutrogena hydro boost water gel",
  },
  {
    id: "kiehls-oil-free-gel", brand: "Kiehl's", loreal: true, name: "Ultra Facial Oil-Free Gel Cream", tier: "balanced", needs: ["gel_moisturizer"], estPriceUsd: 39, fragranceFree: true, texture: "gel", when: "both",
    tagline: "Oil-free gel cream for heat and humidity",
    description: "An oil-free, fragrance-free gel cream that hydrates while keeping pores clear. The warm-weather sibling of Ultra Facial Cream.",
    ingredients: ["glycerin", "glacial_glycoprotein", "salicylic_acid", "vitamin_e"],
    ingredientSource: `${SS}kiehl-s/ultra-facial-oil-free-gel-cream`,
    howToUse: "Apply morning and night to clean skin.",
    obf: "kiehl's ultra facial oil-free gel cream",
  },
  {
    id: "lancome-hydra-zen", brand: "Lancôme", loreal: true, name: "Hydra Zen Gel Cream", tier: "premium", needs: ["gel_moisturizer"], estPriceUsd: 70, fragranceFree: false, texture: "gel", when: "both",
    tagline: "Soothing, oil-free gel cream with rose and squalane",
    description: "A soothing gel cream with hyaluronic acid, squalane and rose extract for stressed skin in warm weather.",
    ingredients: ["hyaluronic_acid", "squalane", "glycerin", "bisabolol", "vitamin_e"],
    ingredientSource: `${SS}lancome/hydra-zen-moisturising-and-soothing-gel-cream`,
    howToUse: "Apply morning and night after serum.",
    obf: "lancome hydra zen gel cream",
  },

  // ---------- Soothing ----------
  {
    id: "skinceuticals-phyto-corrective", brand: "SkinCeuticals", loreal: true, name: "Phyto Corrective Gel", tier: "premium", needs: ["soothing"], estPriceUsd: 70, fragranceFree: false, texture: "gel", when: "both",
    tagline: "Calming botanical gel for the look of redness",
    description: "A lightweight gel built around cucumber extract and hyaluronic acid to calm the look of redness and hydrate stressed skin. Contains fragrance.",
    ingredients: ["cucumber", "hyaluronic_acid", "glycerin"],
    ingredientSource: `${SS}skinceuticals/phyto-corrective-gel`,
    howToUse: "Apply 3–5 drops morning and night after cleansing.",
    obf: "skinceuticals phyto corrective gel",
  },

  // ---------- Brightening (long-term) ----------
  {
    id: "garnier-vitc", brand: "Garnier", loreal: true, name: "Vitamin C Brightening Serum", tier: "value", needs: ["brightening"], estPriceUsd: 15, fragranceFree: false, longTerm: true, texture: "light", when: "am",
    tagline: "Affordable vitamin C + niacinamide for a brighter tone",
    description: "A daily brightening serum with a vitamin C derivative, niacinamide and hyaluronic acid. Contains fragrance and alcohol.",
    ingredients: ["vitamin_c", "niacinamide", "hyaluronic_acid", "salicylic_acid"],
    ingredientSource: `${SS}garnier/skinactive-vitamin-c-brightening-serum`,
    howToUse: "Apply 3–4 drops in the morning before moisturizer and sunscreen.",
    obf: "garnier vitamin c brightening serum",
  },
  {
    id: "lrp-mela-b3", brand: "La Roche-Posay", loreal: true, name: "Mela B3 Dark Spot Serum", tier: "balanced", needs: ["brightening"], estPriceUsd: 40, fragranceFree: false, longTerm: true, texture: "light", when: "both",
    tagline: "Melasyl™ + niacinamide for the look of dark spots",
    description: "A dark-spot serum with La Roche-Posay's patented Melasyl™ molecule and niacinamide, plus LHA and a retinoid ester. Pair with daily sunscreen.",
    ingredients: ["melasyl", "niacinamide", "lha", "retinoid", "glycerin"],
    ingredientSource: `${SS}la-roche-posay/mela-b3-dark-spot-serum-with-melasyl-niacinamide`,
    howToUse: "Apply morning and night to the whole face. Always wear SPF in the daytime.",
    obf: "la roche-posay mela b3 serum",
  },
  {
    id: "skinceuticals-discoloration-defense", brand: "SkinCeuticals", loreal: true, name: "Discoloration Defense", tier: "premium", needs: ["brightening"], estPriceUsd: 110, fragranceFree: true, longTerm: true, texture: "light", when: "both",
    tagline: "Tranexamic acid + kojic acid + niacinamide",
    description: "A fragrance-free serum combining tranexamic acid, kojic acid and niacinamide for the look of persistent discoloration.",
    ingredients: ["tranexamic_acid", "kojic_acid", "niacinamide", "glycerin"],
    ingredientSource: `${SS}skinceuticals/discoloration-defense-dark-spot-serum`,
    howToUse: "Apply 3–5 drops morning and/or night, then sunscreen in the morning.",
    obf: "skinceuticals discoloration defense",
  },
  {
    id: "skinceuticals-ce-ferulic", brand: "SkinCeuticals", loreal: true, name: "C E Ferulic with 15% L-Ascorbic Acid", concentrations: [{ ingredient: "vitamin_c", pct: 15, label: "L-Ascorbic Acid" }], tier: "premium", needs: ["brightening"], estPriceUsd: 182, fragranceFree: true, longTerm: true, texture: "light", when: "am",
    tagline: "Iconic 15% vitamin C antioxidant serum",
    description: "A high-potency serum with 15% pure vitamin C (L-ascorbic acid), vitamin E and ferulic acid. Used in the morning under sunscreen for antioxidant support and a brighter look.",
    ingredients: ["vitamin_c", "vitamin_e", "ferulic_acid"],
    ingredientSource: `${SS}skinceuticals/c-e-ferulic-with-15-l-ascorbic-acid/when-to-use`,
    howToUse: "Apply 4–5 drops every morning after cleansing, before sunscreen.",
    obf: "skinceuticals c e ferulic",
  },

  // ---------- After-sun ----------
  {
    id: "sunbum-after-sun", brand: "Sun Bum", loreal: false, name: "Cool Down After Sun Gel", tier: "value", needs: ["after_sun"], estPriceUsd: 11, fragranceFree: true, texture: "gel", when: "pm",
    tagline: "Cooling aloe gel after a long day in the sun",
    description: "A lightweight aloe gel with vitamin E that cools and rehydrates sun-exposed skin.",
    ingredients: ["aloe", "vitamin_e", "glycerin"],
    ingredientSource: `${SS}sun-bum/after-sun-cool-down-gel`,
    howToUse: "Apply generously after showering. Keep it in the fridge for extra cooling.",
    obf: "sun bum after sun cool down gel",
  },

  // ---------- Cleanser ----------
  {
    id: "cerave-hydrating-cleanser", brand: "CeraVe", loreal: true, name: "Hydrating Facial Cleanser", tier: "value", needs: ["gentle_cleanser"], estPriceUsd: 16, sensitiveFriendly: true, fragranceFree: true, texture: "light", when: "pm", cleanserFor: "dry",
    tagline: "Non-foaming cleanser with ceramides",
    description: "A creamy, fragrance-free cleanser with ceramides and hyaluronic acid that removes sunscreen and grime without stripping.",
    ingredients: ["ceramides", "hyaluronic_acid", "glycerin"],
    ingredientSource: `${SS}cerave/hydrating-facial-cleanser`,
    howToUse: "Massage onto damp skin in the evening, rinse with lukewarm water.",
    obf: "cerave hydrating facial cleanser",
  },
  {
    id: "lrp-toleriane-cleanser", brand: "La Roche-Posay", loreal: true, name: "Toleriane Hydrating Gentle Cleanser", tier: "balanced", needs: ["gentle_cleanser"], estPriceUsd: 17, sensitiveFriendly: true, fragranceFree: true, texture: "light", when: "pm", cleanserFor: "dry",
    tagline: "Milky, sulfate-free cleanser for sensitive skin",
    description: "A gentle cream cleanser with ceramide, niacinamide and panthenol that keeps reactive skin comfortable.",
    ingredients: ["ceramides", "niacinamide", "panthenol", "glycerin"],
    ingredientSource: `${SS}la-roche-posay/toleriane-hydrating-gentle-cleanser-5721ec71-0783-4a2d-b900-79559d021355`,
    howToUse: "Massage onto damp skin and rinse.",
    obf: "la roche-posay toleriane hydrating gentle cleanser",
  },

  // ---------- Cleansers by concern ----------
  {
    id: "cerave-acne-control-cleanser", brand: "CeraVe", loreal: true, name: "Acne Control Cleanser", tier: "value", needs: ["gentle_cleanser"], estPriceUsd: 16, fragranceFree: true, texture: "gel", when: "pm", cleanserFor: "acne",
    concentrations: [{ ingredient: "salicylic_acid", pct: 2 }],
    tagline: "2% salicylic acid gel cleanser for breakout-prone skin",
    description: "A clarifying gel cleanser with 2% salicylic acid to clear clogged pores, purifying clay for shine, and ceramides and niacinamide so it doesn't strip the barrier.",
    ingredients: ["salicylic_acid", "niacinamide", "ceramides", "hyaluronic_acid", "glycerin"],
    ingredientSource: "https://www.cerave.ca/en-ca/skincare/cleansers/acne-control-cleanser",
    howToUse: "Massage onto damp skin for about 60 seconds, then rinse. Start once a day.",
    obf: "cerave acne control cleanser",
  },
  {
    id: "cerave-foaming-cleanser", brand: "CeraVe", loreal: true, name: "Foaming Facial Cleanser", tier: "value", needs: ["gentle_cleanser"], estPriceUsd: 17, sensitiveFriendly: true, fragranceFree: true, texture: "gel", when: "pm", cleanserFor: "oily",
    tagline: "Foaming gel that removes oil without stripping",
    description: "A foaming gel cleanser for normal to oily skin that lifts oil, sweat and sunscreen, with niacinamide and ceramides to keep the barrier comfortable.",
    ingredients: ["niacinamide", "ceramides", "hyaluronic_acid", "cholesterol", "glycerin"],
    ingredientSource: `${SS}cerave/foaming-facial-cleanser`,
    howToUse: "Massage onto damp skin and rinse. Twice a day in hot, humid weather.",
    obf: "cerave foaming facial cleanser",
  },

  // ---------- Toners ----------
  {
    id: "lancome-tonique-confort", brand: "Lancôme", loreal: true, name: "Tonique Confort Re-Hydrating Comforting Toner", tier: "premium", needs: ["toner"], estPriceUsd: 34, fragranceFree: false, texture: "light", when: "both", cleanserFor: "dry",
    tagline: "Hydrating toner with hyaluronic acid and squalane",
    description: "A soft, hydrating toner with glycerin, sodium hyaluronate and squalane that adds a layer of water before serum. Contains fragrance.",
    ingredients: ["glycerin", "squalane", "hyaluronic_acid"],
    ingredientSource: `${SS}lancome/tonique-confort-re-hydrating-comforting-toner-with-acacia-honey`,
    howToUse: "After cleansing, pat onto the face with your hands or a cotton pad, morning and night.",
    obf: "lancome tonique confort",
  },
  {
    id: "lrp-effaclar-toner", brand: "La Roche-Posay", loreal: true, name: "Effaclar Clarifying Solution Acne Toner", tier: "balanced", needs: ["toner"], estPriceUsd: 22, fragranceFree: true, texture: "light", when: "pm", cleanserFor: "acne",
    tagline: "Salicylic and glycolic acid toner for oily, breakout-prone skin",
    description: "A clarifying toner with salicylic acid and glycolic acid that helps clear pores and refine texture. It contains alcohol, so it is for oily skin, not dry or reactive skin.",
    ingredients: ["salicylic_acid", "glycolic_acid"],
    ingredientSource: `${SS}la-roche-posay/effaclar-clarifying-solution-acne-toner`,
    howToUse: "At night after cleansing, swipe with a cotton pad. Avoid the eye area. Sunscreen every morning.",
    obf: "la roche-posay effaclar clarifying solution",
  },
  {
    // Skinsort counts the calendula flower extract as fragrance, so we don't call it fragrance-free.
    id: "kiehls-calendula-toner", brand: "Kiehl's", loreal: true, name: "Calendula Herbal-Extract Alcohol-Free Toner", tier: "balanced", needs: ["toner"], estPriceUsd: 25, fragranceFree: false, texture: "light", when: "both", cleanserFor: "dry",
    tagline: "Alcohol-free calendula toner that calms the look of redness",
    description: "An alcohol-free toner with calendula petals and allantoin that refreshes and calms skin after a long day of travel.",
    ingredients: ["calendula"],
    ingredientSource: `${SS}kiehl-s/calendula-herbal-extract-alcohol-free-toner`,
    howToUse: "After cleansing, pat on with a cotton pad, morning and night.",
    obf: "kiehl's calendula herbal extract toner",
  },

  // ---------- Blemish care ----------
  {
    id: "lrp-effaclar-duo", brand: "La Roche-Posay", loreal: true, name: "Effaclar Duo Acne Spot Treatment", tier: "balanced", needs: ["blemish_care"], estPriceUsd: 23, fragranceFree: true, texture: "light", when: "pm",
    concentrations: [{ ingredient: "benzoyl_peroxide", pct: 5.5 }],
    tagline: "5.5% micronized benzoyl peroxide with LHA for breakouts",
    description: "A spot treatment that pairs micronized benzoyl peroxide with LHA for gentle micro-exfoliation. Dab it on breakouts, not the whole face.",
    ingredients: ["benzoyl_peroxide", "lha", "glycerin", "vitamin_e"],
    ingredientSource: "https://www.dermstore.com/p/la-roche-posay-effaclar-duo-dual-action-acne-spot-treatment-cream-0.7-fl.-oz/14261307/",
    howToUse: "Apply a thin layer on breakouts once a day at first. Benzoyl peroxide can bleach fabric: use a white pillowcase.",
    obf: "la roche-posay effaclar duo",
  },

  // ---------- Pore care ----------
  {
    id: "ordinary-niacinamide-10", brand: "The Ordinary", loreal: false, name: "Niacinamide 10% + Zinc 1%", tier: "value", needs: ["pore_serum"], estPriceUsd: 7, fragranceFree: true, texture: "light", when: "both",
    concentrations: [
      { ingredient: "niacinamide", pct: 10 },
      { ingredient: "zinc", pct: 1, label: "Zinc PCA" },
    ],
    tagline: "High-strength niacinamide with zinc for shine and pores",
    description: "A water-light serum with 10% niacinamide and 1% zinc PCA aimed at visible pores and excess oil. Strong: sensitive skin should start every other day.",
    ingredients: ["niacinamide", "zinc"],
    ingredientSource: "https://skinsort.com/products/the-ordinary/niacinamide-10-zinc-1",
    howToUse: "A few drops before moisturizer, morning or night. Start every other day.",
    obf: "the ordinary niacinamide 10% zinc 1%",
  },
  {
    id: "pc-bha-2", brand: "Paula's Choice", loreal: false, name: "Skin Perfecting 2% BHA Liquid Exfoliant", tier: "balanced", needs: ["pore_serum", "exfoliant", "blemish_care"], estPriceUsd: 36, fragranceFree: true, texture: "light", when: "pm",
    concentrations: [{ ingredient: "salicylic_acid", pct: 2, label: "Salicylic Acid (BHA)" }],
    tagline: "Leave-on 2% BHA that clears pores and smooths texture",
    description: "A leave-on liquid with 2% salicylic acid that works inside the pore, so it helps with clogged pores, blemishes and rough texture in one step.",
    ingredients: ["salicylic_acid"],
    ingredientSource: "https://skinsort.com/products/paula-s-choice/skin-perfecting-2-bha-liquid-exfoliant/dupes",
    howToUse: "Swipe or pat on at night after cleansing, every other night at first. Wear sunscreen the next day.",
    obf: "paula's choice 2% bha liquid exfoliant",
  },
  {
    id: "lrp-niacinamide-10", brand: "La Roche-Posay", loreal: true, name: "10% Pure Niacinamide Serum", tier: "premium", needs: ["pore_serum"], estPriceUsd: 40, fragranceFree: false, texture: "light", when: "both",
    concentrations: [{ ingredient: "niacinamide", pct: 10 }],
    tagline: "10% niacinamide serum for uneven-looking, oily-prone skin",
    description: "A light serum with 10% niacinamide and hyaluronic acid for visible pores and uneven tone. Contains fragrance and alcohol, so reactive skin should patch-test.",
    ingredients: ["niacinamide", "hyaluronic_acid", "glycerin", "vitamin_e"],
    ingredientSource: `${SS}la-roche-posay/10-pure-niacinamide-serum`,
    howToUse: "A few drops morning and/or night before moisturizer.",
    obf: "la roche-posay pure niacinamide 10 serum",
  },

  // ---------- Exfoliant ----------
  {
    id: "loreal-glycolic-10", brand: "L'Oréal Paris", loreal: true, name: "Revitalift Derm Intensives 10% Pure Glycolic Acid Serum", tier: "balanced", needs: ["exfoliant"], estPriceUsd: 30, fragranceFree: true, texture: "light", when: "pm",
    concentrations: [{ ingredient: "glycolic_acid", pct: 10 }],
    tagline: "10% glycolic acid night serum for smoother, brighter-looking skin",
    description: "An AHA night serum that loosens dull surface cells for smoother texture. AHAs make skin more sun-sensitive, so it stays a night-only step.",
    ingredients: ["glycolic_acid", "glycerin"],
    ingredientSource: "https://skinsort.com/compare/l-oreal-revitalift-derm-intensives-glycolic-acid-serum-vs-l-oreal-revitalift-derm-intensives-vitamin-c-serum",
    howToUse: "At night on dry skin, 2 to 3 times a week at first. Sunscreen every morning.",
    obf: "l'oreal revitalift 10% glycolic acid serum",
  },

  // ---------- Line smoothing ----------
  {
    id: "ordinary-matrixyl", brand: "The Ordinary", loreal: false, name: "Matrixyl 10% + HA", tier: "value", needs: ["line_smoothing"], estPriceUsd: 13, sensitiveFriendly: true, fragranceFree: true, texture: "light", when: "both",
    concentrations: [{ ingredient: "peptides", pct: 10, label: "Matrixyl peptides" }],
    tagline: "Peptide and hyaluronic acid serum for fine lines, day or night",
    description: "A gentle serum with Matrixyl peptide complexes and hyaluronic acid to smooth the look of fine lines. No acids or retinoids, so it is fine under sunscreen on sunny trips.",
    ingredients: ["peptides", "hyaluronic_acid"],
    ingredientSource: "https://skinsort.com/products/the-ordinary/matrixyl-10-ha/dupes",
    howToUse: "A few drops morning and night before moisturizer.",
    obf: "the ordinary matrixyl 10% + ha",
  },
  {
    id: "loreal-retinol-03", brand: "L'Oréal Paris", loreal: true, name: "Revitalift Derm Intensives Night Serum, 0.3% Pure Retinol", tier: "balanced", needs: ["line_smoothing"], estPriceUsd: 35, fragranceFree: true, texture: "light", when: "pm",
    concentrations: [{ ingredient: "retinoid", pct: 0.3, label: "Retinol" }],
    tagline: "0.3% retinol night serum for fine lines",
    description: "A night serum with 0.3% pure retinol and hyaluronic acid for fine lines and texture. Best started at home well before a trip, not on a sunny one.",
    ingredients: ["retinoid", "hyaluronic_acid", "glycerin", "vitamin_e"],
    ingredientSource: `${SS}l-oreal/revitalift-derm-intensives-night-serum-with-0-3-pure-retinol`,
    howToUse: "At night, 2 to 3 times a week at first. Daily sunscreen is a must.",
    obf: "l'oreal revitalift 0.3% pure retinol night serum",
  },

  // ---------- Lips ----------
  {
    id: "kiehls-lip-balm", brand: "Kiehl's", loreal: true, name: "Lip Balm #1", tier: "balanced", needs: ["lip_care"], estPriceUsd: 13, sensitiveFriendly: true, fragranceFree: true, texture: "balm", when: "both",
    tagline: "Classic, fragrance-free lip balm",
    description: "A classic lip balm with shea butter, squalane and vitamin E that protects lips from cold, wind and dry cabin air.",
    ingredients: ["shea_butter", "squalane", "vitamin_e"],
    ingredientSource: `${SS}kiehl-s/lip-balm-1`,
    howToUse: "Apply as often as needed, especially before going outside.",
    obf: "kiehl's lip balm #1",
  },

  // ---------- Mist ----------
  {
    id: "lrp-thermal-water", brand: "La Roche-Posay", loreal: true, name: "Thermal Spring Water", tier: "value", needs: ["face_mist"], estPriceUsd: 16, sensitiveFriendly: true, fragranceFree: true, texture: "spray", when: "both",
    tagline: "Single-ingredient mist for flights and long rides",
    description: "Pure La Roche-Posay thermal spring water in a mist, fragrance-free and gentle. Choose the travel size for carry-on rules.",
    ingredients: ["thermal_water"],
    ingredientSource: `${SS}la-roche-posay/thermal-spring-water`,
    howToUse: "Mist over the face, wait a minute, pat dry and follow with moisturizer. Repeat every 2–3 hours on long trips.",
    obf: "la roche-posay thermal spring water",
  },
];

type ImageInfo = { src: string; code: string; sourceUrl: string };
const IMAGE_MAP = IMAGES as Record<string, ImageInfo>;

export const CATALOG: Product[] = SEEDS.map((seed) => {
  const { obf, ...p } = seed;
  void obf; // only used by the asset script
  return { ...p, url: searchUrl(`${p.brand} ${p.name}`), image: IMAGE_MAP[p.id] ?? null };
});

export const getProduct = (id: string) => CATALOG.find((p) => p.id === id) ?? null;

export const TIERS: BudgetTier[] = ["value", "balanced", "premium"];

/** Other products that cover the same need, cheapest first. */
export const alternativesFor = (p: Product, limit = 4) =>
  CATALOG.filter((x) => x.id !== p.id && x.needs.some((n) => p.needs.includes(n)))
    .sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier))
    .slice(0, limit);
