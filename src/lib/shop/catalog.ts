// MVP product catalog. Prices are rough US estimates for the demo only —
// always check the retailer page. Swap this file for a real Shop API
// provider (see src/lib/shop/provider.ts) without touching the engine.
//
// `obf` is the search query (or barcode) used by scripts/setup-assets.mjs to
// find a front photo on Open Beauty Facts.

import type { BudgetTier, Product } from "../types";
import IMAGES from "./product-images.json";

const AMAZON_TAG = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG;

/** Retailer search link. Adds your Amazon Associates tag when configured. */
export function searchUrl(query: string) {
  const base = `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
  return AMAZON_TAG ? `${base}&tag=${encodeURIComponent(AMAZON_TAG)}` : base;
}

export type Seed = Omit<Product, "url" | "image"> & { obf: string };

export const SEEDS: Seed[] = [
  // ---------- Sunscreen ----------
  {
    id: "neutrogena-ultra-sheer-55", brand: "Neutrogena", name: "Ultra Sheer Dry-Touch Sunscreen SPF 55", tier: "value", needs: ["sunscreen"], estPriceUsd: 12, spf: 55, waterResistant: true, texture: "light",
    tagline: "Budget-friendly, water-resistant high SPF",
    description: "A lightweight, non-greasy broad-spectrum lotion that stays put for 80 minutes in water or sweat. An easy pick for beach and outdoor days.",
    keyIngredients: ["Broad-spectrum UVA/UVB filters", "Dry-touch technology"],
    howToUse: "Apply generously 15 minutes before sun. Reapply after 80 minutes of swimming or sweating and at least every 2 hours.",
    obf: "neutrogena ultra sheer dry-touch spf 55",
  },
  {
    id: "biore-aqua-rich", brand: "Bioré", name: "UV Aqua Rich Watery Essence SPF 50+ PA++++", tier: "value", needs: ["sunscreen"], estPriceUsd: 18, spf: 50, waterResistant: false, texture: "light",
    tagline: "Weightless, watery high-SPF for city days",
    description: "A light, fast-absorbing essence-texture sunscreen with very high UVA protection (PA++++). Feels like a moisturizer and sits well under makeup.",
    keyIngredients: ["UVA/UVB filters", "Hyaluronic acid"],
    howToUse: "Apply as the last step of your morning routine. Reapply every 2 hours outdoors.",
    obf: "biore uv aqua rich watery essence",
  },
  {
    id: "cerave-am-30", brand: "CeraVe", name: "AM Facial Moisturizing Lotion SPF 30", tier: "value", needs: ["sunscreen"], estPriceUsd: 20, spf: 30, waterResistant: false, sensitiveFriendly: true, texture: "light",
    tagline: "Moisturizer and daily SPF in one step",
    description: "A daily moisturizer with broad-spectrum SPF 30 that also supports the skin barrier. Ideal when UV is low to moderate.",
    keyIngredients: ["Ceramides", "Niacinamide", "Hyaluronic acid"],
    howToUse: "Apply every morning as your moisturizer. Add a dedicated sunscreen for long outdoor days.",
    obf: "cerave am facial moisturizing lotion spf 30",
  },
  {
    id: "lrp-anthelios-60", brand: "La Roche-Posay", name: "Anthelios Melt-in Milk Sunscreen SPF 60", tier: "balanced", needs: ["sunscreen"], estPriceUsd: 38, spf: 60, waterResistant: true, sensitiveFriendly: true, texture: "light",
    tagline: "High protection that holds up in water and sweat",
    description: "A broad-spectrum SPF 60 lotion for face and body, water-resistant for 80 minutes. Built for long days at the beach, on the slopes or outdoors.",
    keyIngredients: ["Broad-spectrum UVA/UVB filters", "La Roche-Posay thermal spring water", "Antioxidant complex"],
    howToUse: "Apply generously 15 minutes before sun exposure. Reapply after 80 minutes of swimming or sweating, and at least every 2 hours.",
    obf: "la roche-posay anthelios melt-in milk spf 60",
  },
  {
    id: "supergoop-unseen-40", brand: "Supergoop!", name: "Unseen Sunscreen SPF 40", tier: "balanced", needs: ["sunscreen"], estPriceUsd: 38, spf: 40, waterResistant: false, texture: "gel",
    tagline: "Invisible, weightless daily SPF that doubles as a primer",
    description: "A clear, oil-free gel sunscreen that disappears on any skin tone and works under makeup. Best for city days with moderate UV.",
    keyIngredients: ["Broad-spectrum UVA/UVB filters", "Red algae", "Meadowfoam seed"],
    howToUse: "Apply as the last step of skincare, before makeup. Reapply every 2 hours outdoors.",
    obf: "supergoop unseen sunscreen spf 40",
  },
  {
    id: "eltamd-uv-clear", brand: "EltaMD", name: "UV Clear Broad-Spectrum SPF 46", tier: "balanced", needs: ["sunscreen"], estPriceUsd: 43, spf: 46, waterResistant: false, sensitiveFriendly: true, texture: "light",
    tagline: "Dermatologist favorite for sensitive, breakout-prone skin",
    description: "An oil-free, fragrance-free facial sunscreen with zinc oxide and niacinamide, designed for skin prone to redness and acne.",
    keyIngredients: ["Zinc oxide", "Niacinamide", "Hyaluronic acid"],
    howToUse: "Apply to the face 15 minutes before going out. Reapply every 2 hours in the sun.",
    obf: "eltamd uv clear spf 46",
  },
  {
    id: "shiseido-ultimate-sun", brand: "Shiseido", name: "Ultimate Sun Protector Lotion SPF 50+", tier: "premium", needs: ["sunscreen"], estPriceUsd: 50, spf: 50, waterResistant: true, texture: "light",
    tagline: "Luxury sun protection that gets stronger with water and heat",
    description: "A very high protection lotion for face and body, designed to stay effective through water, sweat and heat. A premium pick for beach, ski and outdoor trips.",
    keyIngredients: ["Broad-spectrum UVA/UVB filters", "WetForce x HeatForce technology"],
    howToUse: "Shake well. Apply generously before sun exposure and reapply after swimming or towel drying.",
    obf: "shiseido ultimate sun protector lotion spf 50+",
  },

  // ---------- Barrier cream ----------
  {
    id: "vanicream-moisturizing-cream", brand: "Vanicream", name: "Moisturizing Cream", tier: "value", needs: ["barrier_cream"], estPriceUsd: 15, sensitiveFriendly: true, texture: "rich",
    tagline: "Fragrance-free basics for very sensitive skin",
    description: "A thick, non-greasy cream free of dyes, fragrance and common irritants. A reliable barrier cream for cold, dry trips.",
    keyIngredients: ["Petrolatum", "Glycerin", "Sorbitol"],
    howToUse: "Apply to face and body as often as needed, especially after washing.",
    obf: "vanicream moisturizing cream",
  },
  {
    id: "cerave-cream", brand: "CeraVe", name: "Moisturizing Cream with Ceramides", tier: "value", needs: ["barrier_cream"], estPriceUsd: 19, sensitiveFriendly: true, texture: "rich",
    tagline: "Rich, fragrance-free cream that rebuilds the barrier",
    description: "A thick, non-greasy cream with three essential ceramides to restore the skin barrier when cold, dry air pulls moisture out.",
    keyIngredients: ["Ceramides 1, 3, 6-II", "Hyaluronic acid", "MVE controlled-release technology"],
    howToUse: "Apply morning and night to face and body, or as a thicker layer at night in cold, dry places.",
    obf: "cerave moisturizing cream",
  },
  {
    id: "lrp-cicaplast", brand: "La Roche-Posay", name: "Cicaplast Baume B5", tier: "value", needs: ["barrier_cream", "soothing", "lip_care"], estPriceUsd: 17, sensitiveFriendly: true, texture: "balm",
    tagline: "Multi-purpose soothing balm — one tube, many jobs",
    description: "A soothing balm for dry, irritated or chapped skin. Works as a night barrier cream, a rescue balm for redness and a lip treatment — great for packing light.",
    keyIngredients: ["Panthenol (vitamin B5)", "Madecassoside", "Shea butter"],
    howToUse: "Apply a thin layer to dry or irritated areas twice a day, or as the last step of your night routine.",
    obf: "la roche-posay cicaplast baume b5",
  },
  {
    id: "kiehls-ufc", brand: "Kiehl's", name: "Ultra Facial Cream", tier: "balanced", needs: ["barrier_cream"], estPriceUsd: 38, texture: "rich",
    tagline: "Classic 24-hour hydration for harsh climates",
    description: "A lightweight-feeling but deeply hydrating daily cream, long used by people traveling to extreme cold and dry climates.",
    keyIngredients: ["Squalane", "Glacial glycoprotein"],
    howToUse: "Smooth onto clean skin morning and night.",
    obf: "kiehl's ultra facial cream",
  },
  {
    id: "fab-ultra-repair", brand: "First Aid Beauty", name: "Ultra Repair Cream", tier: "balanced", needs: ["barrier_cream"], estPriceUsd: 38, sensitiveFriendly: true, texture: "rich",
    tagline: "Fast relief for dry, distressed skin",
    description: "A whipped, rich cream with colloidal oatmeal that relieves tight, flaky skin from wind and cold.",
    keyIngredients: ["Colloidal oatmeal", "Shea butter", "Ceramides"],
    howToUse: "Apply to face and body whenever skin feels tight or dry.",
    obf: "first aid beauty ultra repair cream",
  },
  {
    id: "drjart-ceramidin", brand: "Dr. Jart+", name: "Ceramidin Skin Barrier Moisturizing Cream", tier: "premium", needs: ["barrier_cream"], estPriceUsd: 48, sensitiveFriendly: true, texture: "rich",
    tagline: "Ceramide-rich cream for a compromised barrier",
    description: "A rich ceramide cream that comforts very dry, weakened skin — a premium choice for winter cities and ski trips.",
    keyIngredients: ["Ceramide complex", "Panthenol"],
    howToUse: "Apply as the last step of your routine, morning and night.",
    obf: "dr jart ceramidin cream",
  },

  // ---------- Hydrating serum ----------
  {
    id: "to-ha-b5", brand: "The Ordinary", name: "Hyaluronic Acid 2% + B5", tier: "value", needs: ["hydrating_serum"], estPriceUsd: 10, sensitiveFriendly: true, texture: "light",
    tagline: "Simple, affordable hydration booster",
    description: "A water-based serum that draws water into the skin's surface. Layer it under moisturizer to fix tight, dehydrated skin.",
    keyIngredients: ["Hyaluronic acid", "Panthenol (vitamin B5)"],
    howToUse: "Apply a few drops to damp skin morning and night, then seal with moisturizer.",
    obf: "the ordinary hyaluronic acid 2% + b5",
  },
  {
    id: "vichy-mineral-89", brand: "Vichy", name: "Minéral 89 Hyaluronic Acid Booster", tier: "balanced", needs: ["hydrating_serum"], estPriceUsd: 33, sensitiveFriendly: true, texture: "light",
    tagline: "Daily strengthening and hydrating booster",
    description: "A gel booster made with Vichy volcanic water and hyaluronic acid to plump and strengthen dehydrated skin.",
    keyIngredients: ["Vichy volcanic water", "Hyaluronic acid"],
    howToUse: "Apply morning and night before moisturizer.",
    obf: "vichy mineral 89",
  },
  {
    id: "lrp-hyalu-b5", brand: "La Roche-Posay", name: "Hyalu B5 Serum", tier: "premium", needs: ["hydrating_serum"], estPriceUsd: 45, sensitiveFriendly: true, texture: "light",
    tagline: "Hydrating and repairing serum for sensitive skin",
    description: "A plumping serum that combines two types of hyaluronic acid with vitamin B5 to hydrate and support skin repair.",
    keyIngredients: ["Hyaluronic acid", "Vitamin B5", "Madecassoside"],
    howToUse: "Apply morning and night before moisturizer.",
    obf: "la roche-posay hyalu b5 serum",
  },

  // ---------- Gel moisturizer ----------
  {
    id: "neutrogena-hydro-boost", brand: "Neutrogena", name: "Hydro Boost Water Gel", tier: "value", needs: ["gel_moisturizer"], estPriceUsd: 20, texture: "gel",
    tagline: "Oil-free gel that hydrates without heaviness",
    description: "A refreshing water-gel moisturizer that keeps skin hydrated in hot, humid weather without clogging pores.",
    keyIngredients: ["Hyaluronic acid", "Glycerin"],
    howToUse: "Apply morning and night. In heat, use it instead of a rich cream during the day.",
    obf: "neutrogena hydro boost water gel",
  },
  {
    id: "clinique-jelly", brand: "Clinique", name: "Dramatically Different Hydrating Jelly", tier: "balanced", needs: ["gel_moisturizer"], estPriceUsd: 32, texture: "gel",
    tagline: "Oil-free jelly for oily and combination skin",
    description: "A light, oil-free jelly moisturizer that hydrates and feels cooling — a good daytime swap for heavy creams in humid places.",
    keyIngredients: ["Oil-free, fragrance-free hydrating jelly"],
    howToUse: "Apply twice a day to clean skin.",
    obf: "clinique dramatically different hydrating jelly",
  },
  {
    id: "belif-aqua-bomb", brand: "belif", name: "The True Cream Aqua Bomb", tier: "balanced", needs: ["gel_moisturizer"], estPriceUsd: 38, texture: "gel",
    tagline: "Burst of cooling hydration",
    description: "A gel-cream that releases a rush of water on the skin — light enough for heat and humidity.",
    keyIngredients: ["Lady's mantle", "Oat husk"],
    howToUse: "Apply as the last step of your routine, morning and night.",
    obf: "belif the true cream aqua bomb",
  },
  {
    id: "tatcha-water-cream", brand: "Tatcha", name: "The Water Cream", tier: "premium", needs: ["gel_moisturizer"], estPriceUsd: 72, texture: "gel",
    tagline: "Oil-free water cream for a fresh, poreless look",
    description: "A luxurious, oil-free water cream that bursts on the skin — a premium pick for tropical and humid destinations.",
    keyIngredients: ["Japanese wild rose", "Japanese leopard lily"],
    howToUse: "Apply a small amount after serum, morning and night.",
    obf: "tatcha the water cream",
  },

  // ---------- Soothing ----------
  {
    id: "avene-cicalfate", brand: "Avène", name: "Cicalfate+ Restorative Protective Cream", tier: "balanced", needs: ["soothing", "barrier_cream"], estPriceUsd: 30, sensitiveFriendly: true, texture: "rich",
    tagline: "Calms and protects irritated skin",
    description: "A restorative cream for irritated, chapped or stressed skin. Helps calm redness from wind, cold and pollution.",
    keyIngredients: ["Avène thermal spring water", "Copper-zinc sulfate", "C+-Restore"],
    howToUse: "Apply twice a day to irritated areas.",
    obf: "avene cicalfate+ cream",
  },
  {
    id: "drjart-cicapair", brand: "Dr. Jart+", name: "Cicapair Tiger Grass Calming Gel Cream", tier: "premium", needs: ["soothing"], estPriceUsd: 49, sensitiveFriendly: true, texture: "gel",
    tagline: "Calms visible redness from wind, sun and pollution",
    description: "A cooling gel cream with centella asiatica to calm redness and support stressed, sensitive skin.",
    keyIngredients: ["Centella asiatica (tiger grass)", "Madecassoside"],
    howToUse: "Apply to red or irritated areas as the last step of your routine, morning or night.",
    obf: "dr jart cicapair calming gel cream",
  },

  // ---------- Brightening ----------
  {
    id: "garnier-vitc", brand: "Garnier", name: "Vitamin C Brightening Serum", tier: "value", needs: ["brightening"], estPriceUsd: 15, texture: "light",
    tagline: "Affordable vitamin C for a brighter, more even tone",
    description: "A daily vitamin C serum to help fade the look of dark spots — start before a sunny trip and always pair with sunscreen.",
    keyIngredients: ["Vitamin C", "Niacinamide"],
    howToUse: "Apply 3–4 drops in the morning before moisturizer and sunscreen.",
    obf: "garnier vitamin c serum",
  },
  {
    id: "loreal-vitc", brand: "L'Oréal Paris", name: "Revitalift Derm Intensives 10% Pure Vitamin C Serum", tier: "balanced", needs: ["brightening"], estPriceUsd: 30, texture: "light",
    tagline: "Vitamin C to keep sun-triggered dark spots in check",
    description: "A 10% pure vitamin C serum for brighter, more even-looking skin. Best started before a sunny trip and always paired with sunscreen.",
    keyIngredients: ["10% pure vitamin C", "Vitamin E", "Salicylic acid"],
    howToUse: "Apply 3–4 drops in the morning before moisturizer and sunscreen.",
    obf: "l'oreal revitalift vitamin c serum",
  },
  {
    id: "skinceuticals-ce-ferulic", brand: "SkinCeuticals", name: "C E Ferulic", tier: "premium", needs: ["brightening"], estPriceUsd: 182, texture: "light",
    tagline: "Gold-standard antioxidant vitamin C serum",
    description: "A high-potency vitamin C serum with vitamin E and ferulic acid that helps defend against environmental stress and brighten skin.",
    keyIngredients: ["15% vitamin C (L-ascorbic acid)", "1% vitamin E", "0.5% ferulic acid"],
    howToUse: "Apply 4–5 drops every morning after cleansing, before sunscreen.",
    obf: "skinceuticals c e ferulic",
  },

  // ---------- After-sun ----------
  {
    id: "sunbum-after-sun", brand: "Sun Bum", name: "Cool Down After Sun Aloe Gel", tier: "value", needs: ["after_sun"], estPriceUsd: 11, texture: "gel",
    tagline: "Cooling relief after a long day in the sun",
    description: "A lightweight aloe gel that cools and rehydrates skin after sun exposure.",
    keyIngredients: ["Aloe vera", "Vitamin E"],
    howToUse: "Apply generously to sun-exposed skin after showering. Keep it in the fridge for extra cooling.",
    obf: "sun bum cool down after sun aloe gel",
  },
  {
    id: "lrp-posthelios", brand: "La Roche-Posay", name: "Posthelios Hydrating After-Sun Gel", tier: "balanced", needs: ["after_sun"], estPriceUsd: 25, sensitiveFriendly: true, texture: "gel",
    tagline: "Soothing after-sun for sensitive skin",
    description: "A cooling after-sun gel that soothes and rehydrates skin after sun exposure.",
    keyIngredients: ["La Roche-Posay thermal spring water", "Glycerin"],
    howToUse: "Apply to face and body after sun exposure.",
    obf: "la roche-posay posthelios",
  },
  {
    id: "clarins-after-sun", brand: "Clarins", name: "After Sun Replenishing Moisture Care", tier: "premium", needs: ["after_sun"], estPriceUsd: 45, texture: "light",
    tagline: "Indulgent after-sun body lotion",
    description: "A soothing after-sun lotion that rehydrates and comforts skin after a day at the beach.",
    keyIngredients: ["Plant extracts", "Shea butter"],
    howToUse: "Apply to face and body after sun exposure.",
    obf: "clarins after sun",
  },

  // ---------- Cleanser ----------
  {
    id: "cerave-hydrating-cleanser", brand: "CeraVe", name: "Hydrating Facial Cleanser", tier: "value", needs: ["gentle_cleanser"], estPriceUsd: 16, sensitiveFriendly: true, texture: "light",
    tagline: "Gentle, non-foaming cleanser that won't strip skin",
    description: "A creamy cleanser that removes sunscreen, sweat and pollution while keeping the skin barrier intact.",
    keyIngredients: ["Ceramides", "Hyaluronic acid", "Glycerin"],
    howToUse: "Massage onto damp skin in the evening, rinse with lukewarm water.",
    obf: "cerave hydrating facial cleanser",
  },
  {
    id: "lrp-toleriane-cleanser", brand: "La Roche-Posay", name: "Toleriane Hydrating Gentle Cleanser", tier: "balanced", needs: ["gentle_cleanser"], estPriceUsd: 18, sensitiveFriendly: true, texture: "light",
    tagline: "Milky cleanser for sensitive skin",
    description: "A gentle, creamy cleanser that removes dirt and makeup while keeping skin comfortable.",
    keyIngredients: ["Ceramide-3", "Niacinamide", "Glycerin"],
    howToUse: "Massage onto damp skin and rinse.",
    obf: "la roche-posay toleriane hydrating gentle cleanser",
  },
  {
    id: "fresh-soy-cleanser", brand: "fresh", name: "Soy Face Cleanser", tier: "premium", needs: ["gentle_cleanser"], estPriceUsd: 40, texture: "gel",
    tagline: "Gentle gel cleanser that removes makeup and sunscreen",
    description: "A pH-balanced gel cleanser that removes makeup and sunscreen without stripping skin.",
    keyIngredients: ["Soy proteins", "Cucumber extract", "Rosewater"],
    howToUse: "Massage onto damp skin, including the eye area, and rinse.",
    obf: "fresh soy face cleanser",
  },

  // ---------- Lip care ----------
  {
    id: "aquaphor-lip", brand: "Aquaphor", name: "Lip Repair Ointment", tier: "value", needs: ["lip_care"], estPriceUsd: 5, sensitiveFriendly: true, texture: "balm",
    tagline: "Pocket-size rescue for chapped lips",
    description: "A protective ointment that soothes and repairs dry, chapped lips in cold or windy weather.",
    keyIngredients: ["Shea butter", "Vitamin E", "Chamomile essence"],
    howToUse: "Apply as often as needed, especially before going outside.",
    obf: "aquaphor lip repair",
  },
  {
    id: "laneige-lip", brand: "Laneige", name: "Lip Sleeping Mask", tier: "balanced", needs: ["lip_care"], estPriceUsd: 24, texture: "balm",
    tagline: "Overnight lip treatment",
    description: "A rich overnight lip mask that softens and hydrates lips while you sleep.",
    keyIngredients: ["Berry fruit complex", "Vitamin C", "Shea butter"],
    howToUse: "Apply a generous layer before bed.",
    obf: "laneige lip sleeping mask",
  },
  {
    id: "fresh-sugar-lip", brand: "fresh", name: "Sugar Lip Treatment", tier: "premium", needs: ["lip_care"], estPriceUsd: 26, texture: "balm",
    tagline: "Hydrating lip balm with a hint of care",
    description: "A smoothing lip treatment that conditions and protects dry lips throughout the day.",
    keyIngredients: ["Sugar", "Shea butter", "Grapeseed oil"],
    howToUse: "Apply throughout the day as needed.",
    obf: "fresh sugar lip treatment",
  },

  // ---------- Face mist ----------
  {
    id: "avene-water", brand: "Avène", name: "Thermal Spring Water Spray (travel size)", tier: "value", needs: ["face_mist", "soothing"], estPriceUsd: 10, sensitiveFriendly: true, texture: "spray",
    tagline: "In-flight mist that soothes and refreshes",
    description: "A soothing thermal water mist for sensitive skin. The travel size fits carry-on liquid rules.",
    keyIngredients: ["Avène thermal spring water"],
    howToUse: "Spray onto the face, wait 1 minute, pat dry and follow with moisturizer. Mist every 2–3 hours on long trips.",
    obf: "avene thermal spring water",
  },
  {
    id: "mario-badescu-spray", brand: "Mario Badescu", name: "Facial Spray with Aloe, Herbs and Rosewater", tier: "value", needs: ["face_mist"], estPriceUsd: 9, texture: "spray",
    tagline: "Refreshing rosewater mist",
    description: "A hydrating mist with aloe and rosewater to refresh skin on long flights and train rides.",
    keyIngredients: ["Aloe vera", "Rosewater", "Herbal extracts"],
    howToUse: "Mist over the face whenever skin feels dry or tight.",
    obf: "mario badescu facial spray aloe herbs rosewater",
  },
  {
    id: "caudalie-beauty-elixir", brand: "Caudalie", name: "Beauty Elixir", tier: "premium", needs: ["face_mist"], estPriceUsd: 49, texture: "spray",
    tagline: "Iconic glow-boosting face mist",
    description: "A refreshing face mist that wakes up tired, travel-worn skin and sets makeup.",
    keyIngredients: ["Grape extract", "Mint", "Rosemary"],
    howToUse: "Shake well, close your eyes and mist over the face.",
    obf: "caudalie beauty elixir",
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
