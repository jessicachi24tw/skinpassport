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
  wrinkle?: number;
}

export type SkinTypeLabel = "Normal" | "Oily" | "Dry" | "Combination" | "Redness" | "Dry & Redness" | "Oily & Redness" | "Combination & Redness";

/** YouCam skin type classification for the whole face and each zone. */
export interface SkinType {
  whole: SkinTypeLabel | null;
  tZone?: SkinTypeLabel | null;
  uZone?: SkinTypeLabel | null;
}

export type ConcernKey = keyof SkinScores;

export interface SkinProfile {
  source: "youcam" | "demo";
  label: string;
  overall: number | null;
  skinAge: number | null;
  scores: SkinScores;
  /** YouCam skin type classification (if returned). */
  skinType?: SkinType | null;
  /** YouCam per-concern mask PNGs (transparent overlays, same size as the photo). Expire after ~2 h. */
  masks?: Partial<Record<ConcernKey, string>>;
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
  /** Days from today to departure (unknown for demo scenarios). */
  daysUntil?: number;
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
  /** "forecast" = live forecast (trip within 16 days), "typical" = last year's weather for the same dates. */
  basis?: "forecast" | "typical";
  uvEstimated?: boolean; // UV estimated from latitude/date (no UV in the history)
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
  | "face_mist"
  | "blemish_care"
  | "pore_serum"
  | "exfoliant"
  | "line_smoothing"
  | "toner";

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

/** Budget tier shown to the user as Value / Balanced / Premium. */
export type BudgetTier = "value" | "balanced" | "premium";

export interface ProductImage {
  src: string; // background-removed PNG under /public/products
  code: string; // Open Beauty Facts barcode
  sourceUrl: string; // Open Beauty Facts product page (CC BY-SA 3.0)
}

/** Ingredients we can explain (only listed when verified in the product's INCI list). */
export type IngredientId =
  | "hyaluronic_acid"
  | "ceramides"
  | "glycerin"
  | "squalane"
  | "panthenol"
  | "centella"
  | "niacinamide"
  | "vitamin_c"
  | "tranexamic_acid"
  | "kojic_acid"
  | "melasyl"
  | "vitamin_e"
  | "ferulic_acid"
  | "shea_butter"
  | "petrolatum"
  | "cholesterol"
  | "glacial_glycoprotein"
  | "peptides"
  | "salicylic_acid"
  | "lha"
  | "retinoid"
  | "zinc_oxide"
  | "uv_filters"
  | "cucumber"
  | "aloe"
  | "thermal_water"
  | "bisabolol"
  | "benzoyl_peroxide"
  | "glycolic_acid"
  | "zinc"
  | "calendula";

/** A percentage the brand states for an ingredient (on the name, label or drug facts). */
export interface StatedConcentration {
  ingredient: IngredientId;
  pct: number;
  /** Shown instead of the ingredient name, e.g. "Matrixyl". */
  label?: string;
}

export interface Product {
  id: string;
  brand: string;
  /** Part of the L'Oréal Groupe portfolio. */
  loreal: boolean;
  name: string;
  tier: BudgetTier;
  needs: NeedId[];
  estPriceUsd: number;
  spf?: number;
  waterResistant?: boolean;
  sensitiveFriendly?: boolean;
  texture?: Texture;
  fragranceFree: boolean;
  /** Needs ~4 weeks of daily use to show results (e.g. brightening serums). */
  longTerm?: boolean;
  /** Best used in the morning / at night. */
  when?: "am" | "pm" | "both";
  tagline: string;
  description: string;
  ingredients: IngredientId[]; // verified against the INCI list
  /** Only percentages the brand itself states. Nothing estimated. */
  concentrations?: StatedConcentration[];
  /** For cleansers and toners: which skin it is built for. */
  cleanserFor?: "dry" | "oily" | "acne";
  ingredientSource: string; // where the INCI list was checked
  howToUse: string;
  url: string;
  image: ProductImage | null;
}

/** A product the user already owns (Step 3). */
export interface OwnedProduct {
  id: string;
  name: string;
  brand: string;
  needs: NeedId[];
  spf?: number;
  waterResistant?: boolean;
  ingredients?: IngredientId[];
  /** Flags parsed from an ingredient list, e.g. a retinoid or exfoliating acid. */
  photosensitizing?: boolean;
  /** A treatment (retinol, acids…) rather than one of the trip categories. */
  treatment?: boolean;
  source: "catalog" | "openbeautyfacts" | "manual";
  catalogId?: string;
}

export type Band = "weak" | "normal" | "strong";
export type RiskLevel = "low" | "medium" | "high";
export type ConcernGroup = "hydration" | "clarity" | "tone" | "lines";

export interface ConcernReport {
  key: ConcernKey;
  group: ConcernGroup;
  label: string;
  score: number;
  band: Band;
  risk: RiskLevel;
  riskReason: string;
}

export interface Recommendation {
  need: Need;
  /** Best product for each budget tier (falls back to the nearest tier). */
  options: Record<BudgetTier, Product | null>;
  /** Owned products that already cover this need, with a spec check. */
  owned: { product: OwnedProduct; meetsSpec: boolean; note?: string }[];
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
  items: Recommendation[]; // sorted by necessity, "skip" removed
  shift: ClimateShift | null;
  report: ConcernReport[];
  /** Markdown-light bullets: **bold** is the only markup. */
  summary: string[];
  summarySource: "llm" | "template";
  warnings: string[]; // e.g. retinoid + strong sun
}
