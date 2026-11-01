// Fixed demo data so the pitch demo is repeatable and costs no API units.

import type { Activity, Climate, Place, SkinProfile } from "../types";

export const DEMO_SKIN: SkinProfile = {
  source: "demo",
  label: "Demo scan: dry, slightly sensitive skin",
  overall: 61,
  skinAge: 29,
  scores: {
    moisture: 32,
    oiliness: 78,
    redness: 54,
    age_spot: 66,
    acne: 64,
    pore: 56,
    texture: 58,
    radiance: 49,
    wrinkle: 66,
  },
  skinType: { whole: "Dry & Redness", tZone: "Normal", uZone: "Dry & Redness" },
};

/** Home climate used by demo scenarios when no live origin forecast is available. */
export const DEMO_ORIGIN_CLIMATE: Climate = {
  locationName: "Taipei",
  source: "demo",
  basis: "forecast",
  tempMinC: 21,
  tempMaxC: 27,
  humidityPct: 76,
  uvMax: 6,
  aqiMax: 48,
};

export const DEMO_ORIGIN: Place = { id: "demo-taipei", name: "Taipei", country: "Taiwan", countryCode: "TW", lat: 25.033, lon: 121.565 };

export interface Scenario {
  id: string;
  label: string;
  emoji: string;
  place: Place;
  activities: Activity[];
  days: number;
  climate: Climate;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "nyc-winter",
    label: "New York, dry winter",
    emoji: "❄️",
    place: { id: "demo-nyc", name: "New York", admin1: "New York", country: "United States", countryCode: "US", lat: 40.713, lon: -74.006 },
    activities: ["city"],
    days: 4,
    climate: { locationName: "New York (January)", source: "demo", tempMinC: -6, tempMaxC: 3, humidityPct: 38, uvMax: 2, aqiMax: 55 },
  },
  {
    id: "miami-uv",
    label: "Miami, high UV",
    emoji: "☀️",
    place: { id: "demo-miami", name: "Miami", admin1: "Florida", country: "United States", countryCode: "US", lat: 25.762, lon: -80.192 },
    activities: ["beach"],
    days: 4,
    climate: { locationName: "Miami (July)", source: "demo", tempMinC: 26, tempMaxC: 33, humidityPct: 74, uvMax: 11, aqiMax: 38 },
  },
  {
    id: "hokkaido-ski",
    label: "Hokkaido, ski trip",
    emoji: "🎿",
    place: { id: "demo-niseko", name: "Niseko", admin1: "Hokkaido", country: "Japan", countryCode: "JP", lat: 42.805, lon: 140.687 },
    activities: ["ski"],
    days: 4,
    climate: { locationName: "Niseko (February)", source: "demo", tempMinC: -12, tempMaxC: -3, humidityPct: 52, uvMax: 4, aqiMax: 25 },
  },
];

export const getScenario = (id: string) => SCENARIOS.find((s) => s.id === id) ?? null;
