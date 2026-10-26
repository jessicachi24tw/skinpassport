// Shared types used by both the frontend and the backend.

/** YouCam skin concern scores. 1–100, higher = healthier-looking skin. */
export interface SkinScores {
  moisture: number;
  oiliness: number;
  redness: number;
  age_spot: number;
  acne?: number;
  pore?: number;
  texture?: number;
  radiance?: number;
}

export interface SkinProfile {
  source: "youcam" | "demo";
  label: string;
  overall: number | null;
  skinAge: number | null;
  scores: SkinScores;
}

export type Activity = "city" | "beach" | "ski" | "outdoor" | "business";

export interface TripInput {
  destination: string;
  startDate: string; // YYYY-MM-DD
  days: number;
  activity: Activity;
  flight: boolean;
}

/** Climate summary for the trip window. */
export interface Climate {
  locationName: string;
  source: "open-meteo" | "openweather" | "demo";
  tempMinC: number;
  tempMaxC: number;
  humidityPct: number; // average relative humidity
  uvMax: number; // max daily UV index
  aqiMax: number | null; // US AQI (0–500), null if unknown
}

export type NeedId =
  | "sunscreen"
  | "barrier_cream"
  | "hydrating_serum"
  | "gel_moisturizer"
  | "soothing"
  | "brightening"
  | "after_sun"
  | "gentle_cleanser"
  | "lip_care"
  | "face_mist";

export type Tier = "must" | "recommended" | "optional" | "skip";

export interface Need {
  id: NeedId;
  title: string;
  score: number; // 0–100 necessity score
  tier: Tier;
  stars: number; // 1–5
  reasons: string[];
  spec?: string; // e.g. "SPF 50+, PA++++, water-resistant"
}

export interface Product {
  id: string;
  brand: string;
  name: string;
  needs: NeedId[];
  estPriceUsd: number;
  spf?: number;
  waterResistant?: boolean;
  sensitiveFriendly?: boolean;
  texture?: "rich" | "light" | "gel" | "spray" | "balm";
  url: string;
}

export interface Recommendation {
  need: Need;
  product: Product | null;
}

export interface Kit {
  id: "essential" | "complete";
  title: string;
  items: Recommendation[];
  subtotalUsd: number;
}

export interface PlanResult {
  needs: Need[];
  kits: Kit[];
  preTrip: string[];
  duringTrip: string[];
  coachNote: string;
  coachSource: "llm" | "template";
}
