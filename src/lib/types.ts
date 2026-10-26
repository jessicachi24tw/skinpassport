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

/** A geocoded place (city) picked from autocomplete. */
export interface Place {
  id: string;
  name: string;
  admin1?: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
}

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
}

/** Activity tags (multi-select). */
export type Activity = "city" | "beach" | "pool" | "ski" | "hiking" | "festival" | "business" | "nightlife";

/** Ways of getting there (multi-select). */
export type Transport = "plane" | "train" | "car" | "bus" | "subway" | "ship";

export interface TripInput {
  origin: Place | null;
  destination: Place | null;
  startDate: string; // YYYY-MM-DD
  days: number;
  transport: Transport[];
  activities: Activity[];
  notes: string;
}

/** What the engine needs from a trip. */
export interface TripContext {
  activities: Activity[];
  transport: Transport[];
  days: number;
}

/** Climate summary for a time window at one place. */
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

export type Texture = "rich" | "light" | "gel" | "spray" | "balm";

export interface Product {
  id: string;
  brand: string;
  name: string;
  needs: NeedId[];
  estPriceUsd: number;
  spf?: number;
  waterResistant?: boolean;
  sensitiveFriendly?: boolean;
  texture?: Texture;
  tagline: string;
  description: string;
  keyIngredients: string[];
  howToUse: string;
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

/** How the destination differs from home. */
export interface ClimateShift {
  fromName: string;
  tempDeltaC: number; // destination avg − origin avg
  humidityDelta: number; // destination − origin (percentage points)
  uvDelta: number;
}

export interface PlanResult {
  needs: Need[];
  kits: Kit[];
  preTrip: string[];
  duringTrip: string[];
  shift: ClimateShift | null;
  coachNote: string;
  coachSource: "llm" | "template";
}
