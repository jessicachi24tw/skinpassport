// Fixed demo data so the pitch demo is repeatable and costs no API units.

import type { Activity, Climate, SkinProfile } from "../types";

export const DEMO_SKIN: SkinProfile = {
  source: "demo",
  label: "Demo scan: dry, slightly sensitive skin",
  overall: 61,
  skinAge: 29,
  scores: { moisture: 32, oiliness: 78, redness: 54, age_spot: 66, acne: 82, pore: 70, texture: 58, radiance: 49 },
};

export interface Scenario {
  id: string;
  label: string;
  emoji: string;
  destination: string;
  activity: Activity;
  days: number;
  climate: Climate;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "nyc-winter",
    label: "New York, dry winter",
    emoji: "❄️",
    destination: "New York, USA",
    activity: "city",
    days: 4,
    climate: { locationName: "New York (January)", source: "demo", tempMinC: -6, tempMaxC: 3, humidityPct: 38, uvMax: 2, aqiMax: 55 },
  },
  {
    id: "miami-uv",
    label: "Miami, high UV",
    emoji: "☀️",
    destination: "Miami, USA",
    activity: "beach",
    days: 4,
    climate: { locationName: "Miami (July)", source: "demo", tempMinC: 26, tempMaxC: 33, humidityPct: 74, uvMax: 11, aqiMax: 38 },
  },
  {
    id: "hokkaido-ski",
    label: "Hokkaido, ski trip",
    emoji: "🎿",
    destination: "Niseko, Hokkaido, Japan",
    activity: "ski",
    days: 4,
    climate: { locationName: "Niseko (February)", source: "demo", tempMinC: -12, tempMaxC: -3, humidityPct: 52, uvMax: 4, aqiMax: 25 },
  },
];

export const getScenario = (id: string) => SCENARIOS.find((s) => s.id === id) ?? null;
