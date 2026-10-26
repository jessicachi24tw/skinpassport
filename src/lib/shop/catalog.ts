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
  { id: "lrp-anthelios-60", brand: "La Roche-Posay", name: "Anthelios Melt-in Milk Sunscreen SPF 60", needs: ["sunscreen"], estPriceUsd: 38, spf: 60, waterResistant: true, sensitiveFriendly: true, texture: "light" },
  { id: "biore-aqua-rich", brand: "Bioré", name: "UV Aqua Rich Watery Essence SPF 50+ PA++++", needs: ["sunscreen"], estPriceUsd: 18, spf: 50, waterResistant: false, texture: "light" },
  { id: "eltamd-uv-clear", brand: "EltaMD", name: "UV Clear Broad-Spectrum SPF 46", needs: ["sunscreen"], estPriceUsd: 43, spf: 46, waterResistant: false, sensitiveFriendly: true, texture: "light" },
  { id: "cerave-am-30", brand: "CeraVe", name: "AM Facial Moisturizing Lotion SPF 30", needs: ["sunscreen"], estPriceUsd: 20, spf: 30, waterResistant: false, sensitiveFriendly: true, texture: "light" },
  // Rich barrier creams
  { id: "cerave-cream", brand: "CeraVe", name: "Moisturizing Cream with Ceramides", needs: ["barrier_cream"], estPriceUsd: 19, sensitiveFriendly: true, texture: "rich" },
  { id: "kiehls-ufc", brand: "Kiehl's", name: "Ultra Facial Cream", needs: ["barrier_cream"], estPriceUsd: 38, texture: "rich" },
  { id: "lrp-cicaplast", brand: "La Roche-Posay", name: "Cicaplast Baume B5", needs: ["barrier_cream", "soothing", "lip_care"], estPriceUsd: 17, sensitiveFriendly: true, texture: "balm" },
  // Hydrating serums
  { id: "to-ha-b5", brand: "The Ordinary", name: "Hyaluronic Acid 2% + B5", needs: ["hydrating_serum"], estPriceUsd: 10, sensitiveFriendly: true, texture: "light" },
  { id: "lrp-hyalu-b5", brand: "La Roche-Posay", name: "Hyalu B5 Serum", needs: ["hydrating_serum"], estPriceUsd: 45, sensitiveFriendly: true, texture: "light" },
  // Gel moisturizers
  { id: "neutrogena-hydro-boost", brand: "Neutrogena", name: "Hydro Boost Water Gel", needs: ["gel_moisturizer"], estPriceUsd: 20, texture: "gel" },
  { id: "clinique-jelly", brand: "Clinique", name: "Dramatically Different Hydrating Jelly", needs: ["gel_moisturizer"], estPriceUsd: 32, texture: "gel" },
  // Soothing
  { id: "drjart-cicapair", brand: "Dr. Jart+", name: "Cicapair Tiger Grass Calming Gel Cream", needs: ["soothing"], estPriceUsd: 49, sensitiveFriendly: true, texture: "gel" },
  // Brightening
  { id: "loreal-vitc", brand: "L'Oréal Paris", name: "Revitalift Derm Intensives 10% Pure Vitamin C Serum", needs: ["brightening"], estPriceUsd: 30, texture: "light" },
  // After-sun
  { id: "sunbum-after-sun", brand: "Sun Bum", name: "Cool Down After Sun Aloe Gel", needs: ["after_sun"], estPriceUsd: 11, texture: "gel" },
  // Cleansers
  { id: "cerave-hydrating-cleanser", brand: "CeraVe", name: "Hydrating Facial Cleanser", needs: ["gentle_cleanser"], estPriceUsd: 16, sensitiveFriendly: true, texture: "light" },
  // Lips
  { id: "aquaphor-lip", brand: "Aquaphor", name: "Lip Repair Ointment", needs: ["lip_care"], estPriceUsd: 5, sensitiveFriendly: true, texture: "balm" },
  { id: "laneige-lip", brand: "Laneige", name: "Lip Sleeping Mask", needs: ["lip_care"], estPriceUsd: 24, texture: "balm" },
  // Mist
  { id: "avene-water", brand: "Avène", name: "Thermal Spring Water Spray (travel size)", needs: ["face_mist", "soothing"], estPriceUsd: 10, sensitiveFriendly: true, texture: "spray" },
];

export const CATALOG: Product[] = SEEDS.map((p) => ({ ...p, url: searchUrl(`${p.brand} ${p.name}`) }));
