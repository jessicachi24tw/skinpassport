// MVP product catalog. Prices are rough US estimates for the demo only —
// always check the retailer page. Swap this file for a real Shop API
// provider (see src/lib/shop/provider.ts) without touching the engine.

import type { Product } from "../types";

const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG;

/** Retailer search link. Adds your Amazon Associates tag when configured. */
export function searchUrl(query: string) {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
  return AMAZON_TAG ? `${base}&tag=${encodeURIComponent(AMAZON_TAG)}` : base;
}

type Seed = Omit<Product, "url">;

const SEEDS: Seed[] = [
  // Sunscreens
  {
    id: "lrp-anthelios-60", brand: "La Roche-Posay", name: "Anthelios Melt-in Milk Sunscreen SPF 60", needs: ["sunscreen"], estPriceUsd: 38, spf: 60, waterResistant: true, sensitiveFriendly: true, texture: "light",
    tagline: "High protection that holds up in water and sweat",
    description: "A broad-spectrum SPF 60 lotion for face and body, water-resistant for 80 minutes. Built for long days at the beach, on the slopes or outdoors.",
    keyIngredients: ["Broad-spectrum UVA/UVB filters", "La Roche-Posay thermal spring water", "Antioxidant complex"],
    howToUse: "Apply generously 15 minutes before sun exposure. Reapply after 80 minutes of swimming or sweating, and at least every 2 hours.",
  },
  {
    id: "biore-aqua-rich", brand: "Bioré", name: "UV Aqua Rich Watery Essence SPF 50+ PA++++", needs: ["sunscreen"], estPriceUsd: 18, spf: 50, waterResistant: false, texture: "light",
    tagline: "Weightless, watery high-SPF for city days",
    description: "A light, fast-absorbing essence-texture sunscreen with very high UVA protection (PA++++). Feels like a moisturizer and sits well under makeup.",
    keyIngredients: ["UVA/UVB filters", "Hyaluronic acid", "Micro-defense formula"],
    howToUse: "Apply as the last step of your morning routine. Reapply every 2 hours outdoors.",
  },
  {
    id: "eltamd-uv-clear", brand: "EltaMD", name: "UV Clear Broad-Spectrum SPF 46", needs: ["sunscreen"], estPriceUsd: 43, spf: 46, waterResistant: false, sensitiveFriendly: true, texture: "light",
    tagline: "Dermatologist favorite for sensitive, breakout-prone skin",
    description: "An oil-free, fragrance-free facial sunscreen with zinc oxide and niacinamide, designed for skin prone to redness and acne.",
    keyIngredients: ["Zinc oxide", "Niacinamide", "Hyaluronic acid"],
    howToUse: "Apply to the face 15 minutes before going out. Reapply every 2 hours in the sun.",
  },
  {
    id: "cerave-am-30", brand: "CeraVe", name: "AM Facial Moisturizing Lotion SPF 30", needs: ["sunscreen"], estPriceUsd: 20, spf: 30, waterResistant: false, sensitiveFriendly: true, texture: "light",
    tagline: "Moisturizer and daily SPF in one step",
    description: "A daily moisturizer with broad-spectrum SPF 30 that also supports the skin barrier. Ideal when UV is low to moderate.",
    keyIngredients: ["Ceramides", "Niacinamide", "Hyaluronic acid"],
    howToUse: "Apply every morning as your moisturizer. Add a dedicated sunscreen for long outdoor days.",
  },
  // Rich barrier creams
  {
    id: "cerave-cream", brand: "CeraVe", name: "Moisturizing Cream with Ceramides", needs: ["barrier_cream"], estPriceUsd: 19, sensitiveFriendly: true, texture: "rich",
    tagline: "Rich, fragrance-free cream that rebuilds the barrier",
    description: "A thick, non-greasy cream with three essential ceramides to restore the skin barrier when cold, dry air pulls moisture out.",
    keyIngredients: ["Ceramides 1, 3, 6-II", "Hyaluronic acid", "MVE controlled-release technology"],
    howToUse: "Apply morning and night to face and body, or as a thicker layer at night in cold, dry places.",
  },
  {
    id: "kiehls-ufc", brand: "Kiehl's", name: "Ultra Facial Cream", needs: ["barrier_cream"], estPriceUsd: 38, texture: "rich",
    tagline: "Classic 24-hour hydration for harsh climates",
    description: "A lightweight-feeling but deeply hydrating daily cream, long used by people traveling to extreme cold and dry climates.",
    keyIngredients: ["Squalane", "Glacial glycoprotein"],
    howToUse: "Smooth onto clean skin morning and night.",
  },
  {
    id: "lrp-cicaplast", brand: "La Roche-Posay", name: "Cicaplast Baume B5", needs: ["barrier_cream", "soothing", "lip_care"], estPriceUsd: 17, sensitiveFriendly: true, texture: "balm",
    tagline: "Multi-purpose soothing balm — one tube, many jobs",
    description: "A soothing balm for dry, irritated or chapped skin. Works as a night barrier cream, a rescue balm for redness and a lip treatment — great for packing light.",
    keyIngredients: ["Panthenol (vitamin B5)", "Madecassoside", "Shea butter"],
    howToUse: "Apply a thin layer to dry or irritated areas twice a day, or as the last step of your night routine.",
  },
  // Hydrating serums
  {
    id: "to-ha-b5", brand: "The Ordinary", name: "Hyaluronic Acid 2% + B5", needs: ["hydrating_serum"], estPriceUsd: 10, sensitiveFriendly: true, texture: "light",
    tagline: "Simple, affordable hydration booster",
    description: "A water-based serum that draws water into the skin's surface. Layer it under moisturizer to fix tight, dehydrated skin.",
    keyIngredients: ["Hyaluronic acid", "Panthenol (vitamin B5)"],
    howToUse: "Apply a few drops to damp skin morning and night, then seal with moisturizer.",
  },
  {
    id: "lrp-hyalu-b5", brand: "La Roche-Posay", name: "Hyalu B5 Serum", needs: ["hydrating_serum"], estPriceUsd: 45, sensitiveFriendly: true, texture: "light",
    tagline: "Hydrating and repairing serum for sensitive skin",
    description: "A plumping serum that combines two types of hyaluronic acid with vitamin B5 to hydrate and support skin repair.",
    keyIngredients: ["Hyaluronic acid", "Vitamin B5", "Madecassoside"],
    howToUse: "Apply morning and night before moisturizer.",
  },
  // Gel moisturizers
  {
    id: "neutrogena-hydro-boost", brand: "Neutrogena", name: "Hydro Boost Water Gel", needs: ["gel_moisturizer"], estPriceUsd: 20, texture: "gel",
    tagline: "Oil-free gel that hydrates without heaviness",
    description: "A refreshing water-gel moisturizer that keeps skin hydrated in hot, humid weather without clogging pores.",
    keyIngredients: ["Hyaluronic acid", "Glycerin"],
    howToUse: "Apply morning and night. In heat, use it instead of a rich cream during the day.",
  },
  {
    id: "clinique-jelly", brand: "Clinique", name: "Dramatically Different Hydrating Jelly", needs: ["gel_moisturizer"], estPriceUsd: 32, texture: "gel",
    tagline: "Oil-free jelly for oily and combination skin",
    description: "A light, oil-free jelly moisturizer that hydrates and feels cooling — a good daytime swap for heavy creams in humid places.",
    keyIngredients: ["Oil-free, fragrance-free hydrating jelly"],
    howToUse: "Apply twice a day to clean skin.",
  },
  // Soothing
  {
    id: "drjart-cicapair", brand: "Dr. Jart+", name: "Cicapair Tiger Grass Calming Gel Cream", needs: ["soothing"], estPriceUsd: 49, sensitiveFriendly: true, texture: "gel",
    tagline: "Calms visible redness from wind, sun and pollution",
    description: "A cooling gel cream with centella asiatica to calm redness and support stressed, sensitive skin.",
    keyIngredients: ["Centella asiatica (tiger grass)", "Madecassoside"],
    howToUse: "Apply to red or irritated areas as the last step of your routine, morning or night.",
  },
  // Brightening
  {
    id: "loreal-vitc", brand: "L'Oréal Paris", name: "Revitalift Derm Intensives 10% Pure Vitamin C Serum", needs: ["brightening"], estPriceUsd: 30, texture: "light",
    tagline: "Vitamin C to keep sun-triggered dark spots in check",
    description: "A 10% pure vitamin C serum for brighter, more even-looking skin. Best started before a sunny trip and always paired with sunscreen.",
    keyIngredients: ["10% pure vitamin C", "Vitamin E", "Salicylic acid"],
    howToUse: "Apply 3–4 drops in the morning before moisturizer and sunscreen.",
  },
  // After-sun
  {
    id: "sunbum-after-sun", brand: "Sun Bum", name: "Cool Down After Sun Aloe Gel", needs: ["after_sun"], estPriceUsd: 11, texture: "gel",
    tagline: "Cooling relief after a long day in the sun",
    description: "A lightweight aloe gel that cools and rehydrates skin after sun exposure.",
    keyIngredients: ["Aloe vera", "Vitamin E"],
    howToUse: "Apply generously to sun-exposed skin after showering. Keep it in the fridge for extra cooling.",
  },
  // Cleansers
  {
    id: "cerave-hydrating-cleanser", brand: "CeraVe", name: "Hydrating Facial Cleanser", needs: ["gentle_cleanser"], estPriceUsd: 16, sensitiveFriendly: true, texture: "light",
    tagline: "Gentle, non-foaming cleanser that won't strip skin",
    description: "A creamy cleanser that removes sunscreen, sweat and pollution while keeping the skin barrier intact.",
    keyIngredients: ["Ceramides", "Hyaluronic acid", "Glycerin"],
    howToUse: "Massage onto damp skin in the evening, rinse with lukewarm water.",
  },
  // Lips
  {
    id: "aquaphor-lip", brand: "Aquaphor", name: "Lip Repair Ointment", needs: ["lip_care"], estPriceUsd: 5, sensitiveFriendly: true, texture: "balm",
    tagline: "Pocket-size rescue for chapped lips",
    description: "A protective ointment that soothes and repairs dry, chapped lips in cold or windy weather.",
    keyIngredients: ["Shea butter", "Vitamin E", "Chamomile essence"],
    howToUse: "Apply as often as needed, especially before going outside.",
  },
  {
    id: "laneige-lip", brand: "Laneige", name: "Lip Sleeping Mask", needs: ["lip_care"], estPriceUsd: 24, texture: "balm",
    tagline: "Overnight lip treatment",
    description: "A rich overnight lip mask that softens and hydrates lips while you sleep.",
    keyIngredients: ["Berry fruit complex", "Vitamin C", "Shea butter"],
    howToUse: "Apply a generous layer before bed.",
  },
  // Mist
  {
    id: "avene-water", brand: "Avène", name: "Thermal Spring Water Spray (travel size)", needs: ["face_mist", "soothing"], estPriceUsd: 10, sensitiveFriendly: true, texture: "spray",
    tagline: "In-flight mist that soothes and refreshes",
    description: "A soothing thermal water mist for sensitive skin. The travel size fits carry-on liquid rules.",
    keyIngredients: ["Avène thermal spring water"],
    howToUse: "Spray onto the face, wait 1 minute, pat dry and follow with moisturizer. Mist every 2–3 hours on long trips.",
  },
];

export const CATALOG: Product[] = SEEDS.map((p) => ({ ...p, url: searchUrl(`${p.brand} ${p.name}`) }));

export const getProduct = (id: string) => CATALOG.find((p) => p.id === id) ?? null;

export const alternativesFor = (p: Product, limit = 3) =>
  CATALOG.filter((x) => x.id !== p.id && x.needs.some((n) => p.needs.includes(n))).slice(0, limit);
