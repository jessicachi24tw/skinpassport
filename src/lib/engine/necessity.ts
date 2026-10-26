// Rule engine: combines current skin scores with the destination climate
// and computes a Necessity Score (0–100) for each product category.
// Pure functions only, so it runs anywhere and is easy to test.

import type { Activity, Climate, Need, NeedId, SkinScores, Tier, TripInput } from "../types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Turn YouCam "health" scores (higher = better) into concern levels (higher = worse). */
export function concernLevels(s: SkinScores) {
  return {
    dryness: clamp(100 - s.moisture),
    oil: clamp(100 - s.oiliness),
    sensitivity: clamp(100 - s.redness),
    spots: clamp(100 - s.age_spot),
  };
}

/** Normalise the climate into 0–100 stress factors. */
export function climateFactors(c: Climate, activity: Activity) {
  // Snow reflects up to ~80% of UV, water and sand also add exposure.
  const uvBoost = activity === "ski" ? 1.5 : activity === "beach" ? 1.15 : 1;
  const effectiveUv = Math.min(12, c.uvMax * uvBoost);
  return {
    uv: clamp((effectiveUv / 11) * 100),
    effectiveUv,
    dryAir: clamp(((60 - c.humidityPct) / 35) * 100),
    humid: clamp(((c.humidityPct - 55) / 30) * 100),
    cold: clamp(((8 - c.tempMinC) / 18) * 100),
    hot: clamp(((c.tempMaxC - 24) / 10) * 100),
    pollution: c.aqiMax == null ? 0 : clamp(((c.aqiMax - 50) / 100) * 100),
  };
}

export function tierFor(score: number): Tier {
  if (score >= 70) return "must";
  if (score >= 50) return "recommended";
  if (score >= 35) return "optional";
  return "skip";
}

export const starsFor = (score: number) => Math.max(1, Math.min(5, Math.round(score / 20)));

/** Minimum sunscreen spec for the effective UV level and activity. */
export function sunscreenSpec(effectiveUv: number, activity: Activity) {
  const waterResistant = activity === "beach" || activity === "ski" || activity === "outdoor";
  const minSpf = effectiveUv >= 8 ? 50 : effectiveUv >= 3 ? 30 : 30;
  const pa = effectiveUv >= 8 ? "PA++++" : "PA+++";
  const label = `SPF ${minSpf}+, ${pa}${waterResistant ? ", water-resistant" : ""}`;
  return { minSpf, waterResistant, label };
}

const TITLES: Record<NeedId, string> = {
  sunscreen: "Sunscreen",
  barrier_cream: "Barrier repair cream",
  hydrating_serum: "Hydrating serum",
  gel_moisturizer: "Lightweight gel moisturizer",
  soothing: "Soothing / anti-redness care",
  brightening: "Brightening (vitamin C)",
  after_sun: "After-sun gel",
  gentle_cleanser: "Gentle cleanser",
  lip_care: "Lip repair",
  face_mist: "In-flight face mist",
};

export function computeNeeds(skin: SkinScores, climate: Climate, trip: Pick<TripInput, "activity" | "flight" | "days">): Need[] {
  const k = concernLevels(skin);
  const f = climateFactors(climate, trip.activity);
  const outdoorish = trip.activity === "beach" || trip.activity === "ski" || trip.activity === "outdoor";
  const needs: Need[] = [];

  const add = (id: NeedId, raw: number, reasons: (string | false)[], spec?: string) => {
    const score = Math.round(clamp(raw));
    needs.push({ id, title: TITLES[id], score, tier: tierFor(score), stars: starsFor(score), reasons: reasons.filter(Boolean) as string[], spec });
  };

  // Sunscreen: always useful, scales with UV and outdoor time.
  const spf = sunscreenSpec(f.effectiveUv, trip.activity);
  add(
    "sunscreen",
    45 + f.uv * 0.5 + (outdoorish ? 12 : 0) + k.spots * 0.08,
    [
      `Peak UV index ${climate.uvMax}${f.effectiveUv > climate.uvMax ? ` (feels like ${f.effectiveUv.toFixed(0)} with ${trip.activity === "ski" ? "snow" : "water and sand"} reflection)` : ""}`,
      outdoorish && "Long hours outdoors",
      k.spots >= 40 && "UV makes existing dark spots worse",
    ],
    spf.label,
  );

  // Rich barrier cream: dry skin + cold, dry air. Penalised in hot weather.
  add(
    "barrier_cream",
    k.dryness * 0.5 + f.dryAir * 0.3 + f.cold * 0.3 + (trip.flight ? 8 : 0) - f.hot * 0.35 - k.oil * 0.15,
    [
      k.dryness >= 40 && `Your moisture score is low (${skin.moisture}/100)`,
      f.dryAir >= 40 && `Dry air at destination (${climate.humidityPct}% humidity)`,
      f.cold >= 40 && `Cold temperatures (down to ${climate.tempMinC}°C) weaken the skin barrier`,
      trip.flight && "Cabin air on the flight is very dry",
    ],
  );

  // Hydrating serum: works in any climate when skin is dehydrated.
  add(
    "hydrating_serum",
    k.dryness * 0.55 + f.dryAir * 0.2 + f.cold * 0.1 + f.hot * 0.15 + (trip.flight ? 12 : 0),
    [
      k.dryness >= 40 && `Your moisture score is low (${skin.moisture}/100)`,
      f.hot >= 40 && "Heat and sun pull water out of the skin",
      trip.flight && "Re-hydrate after the flight",
    ],
  );

  // Gel moisturizer: replaces heavy cream in hot, humid places.
  add(
    "gel_moisturizer",
    f.hot * 0.4 + f.humid * 0.35 + k.oil * 0.25 + k.dryness * 0.15,
    [
      f.hot >= 40 && `Hot weather (up to ${climate.tempMaxC}°C)`,
      f.humid >= 40 && `Humid air (${climate.humidityPct}%) — heavy creams can clog pores`,
      k.oil >= 40 && "Your skin tends to get oily",
    ],
  );

  // Soothing care: sensitive skin under stress (UV, cold wind, pollution).
  add(
    "soothing",
    k.sensitivity * 0.55 + f.pollution * 0.25 + f.cold * 0.15 + f.uv * 0.15,
    [
      k.sensitivity >= 40 && `Your redness score shows sensitivity (${skin.redness}/100)`,
      f.pollution >= 30 && `Air quality is poor (US AQI up to ${climate.aqiMax})`,
      f.cold >= 40 && "Cold wind can trigger redness",
    ],
  );

  // Brightening: only matters when UV is strong and spots are present.
  add(
    "brightening",
    k.spots * 0.5 + f.uv * 0.35,
    [k.spots >= 30 && `Dark spot score ${skin.age_spot}/100`, f.uv >= 60 && "Strong sun can deepen pigmentation"],
  );

  // After-sun: high UV + outdoor activity.
  add(
    "after_sun",
    outdoorish ? f.uv * 0.7 + f.hot * 0.2 + k.sensitivity * 0.1 : f.uv * 0.3,
    [outdoorish && f.uv >= 50 && "Lots of sun exposure planned", k.sensitivity >= 40 && "Sensitive skin recovers slower from sun"],
  );

  // Gentle cleanser: pollution, sunscreen removal, sensitive skin.
  add(
    "gentle_cleanser",
    25 + f.pollution * 0.4 + k.sensitivity * 0.2 + (f.uv >= 60 ? 10 : 0),
    [f.pollution >= 30 && "Remove pollution particles every evening", f.uv >= 60 && "Removes water-resistant sunscreen"],
  );

  // Lip care: cold and dry air.
  add("lip_care", f.dryAir * 0.35 + f.cold * 0.45 + k.dryness * 0.2 + (trip.activity === "ski" ? 10 : 0), [
    f.cold >= 40 && "Cold, windy weather chaps lips",
    f.dryAir >= 40 && "Dry air",
  ]);

  // Face mist: only when flying.
  add("face_mist", trip.flight ? 40 + k.dryness * 0.3 + k.sensitivity * 0.15 : 0, [
    trip.flight && "Airplane cabins are around 10–20% humidity",
  ]);

  return needs.sort((a, b) => b.score - a.score);
}

/** Pre-trip prep (from today until departure) and on-trip habits. */
export function buildRoutine(skin: SkinScores, climate: Climate, trip: Pick<TripInput, "activity" | "flight">, daysUntilTrip: number) {
  const k = concernLevels(skin);
  const f = climateFactors(climate, trip.activity);
  const preTrip: string[] = [];
  const duringTrip: string[] = [];
  const window = daysUntilTrip > 0 ? `the ${daysUntilTrip} day${daysUntilTrip === 1 ? "" : "s"} before you leave` : "the days before you leave";

  if (k.dryness >= 40) preTrip.push(`Hydration boost for ${window}: hydrating serum morning and night, sealed with a moisturizer.`);
  if (k.dryness >= 55) preTrip.push("Use a hydrating sheet mask every other night to rebuild moisture.");
  if (k.sensitivity >= 40) preTrip.push("Pause strong actives (retinol, exfoliating acids) 3 days before departure to calm the barrier.");
  if (k.spots >= 30 && f.uv >= 60) preTrip.push("Start a vitamin C serum in the morning now so it is working before the strong sun.");
  preTrip.push("Patch-test any new product for 48 hours before the trip, not on day one of the trip.");

  if (trip.flight) duringTrip.push("On the flight: skip makeup, apply serum + cream, mist every 2–3 hours, drink water.");
  if (f.uv >= 50) duringTrip.push(`Reapply sunscreen every 2 hours outdoors (UV up to ${f.effectiveUv.toFixed(0)}).`);
  else duringTrip.push("Apply sunscreen every morning even when it is cloudy.");
  if (f.cold >= 40 || f.dryAir >= 40) duringTrip.push("Switch to a richer night cream and keep lip balm in your pocket.");
  if (f.hot >= 40 && f.humid >= 40) duringTrip.push("Use a light gel moisturizer during the day; keep the rich cream for after-sun nights.");
  if (f.pollution >= 30) duringTrip.push("Double-cleanse in the evening to remove pollution and sunscreen.");

  return { preTrip, duringTrip };
}
