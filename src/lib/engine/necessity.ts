// Rule engine: combines current skin scores with the destination climate
// (and how different it is from home) and computes a Necessity Score (0–100)
// for each product category. Pure functions only, so it is easy to test.

import type { Activity, Climate, ClimateShift, Need, NeedId, SkinScores, Tier, TripContext } from "../types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const has = (list: Activity[], ...xs: Activity[]) => xs.some((x) => list.includes(x));

/** Activities with long hours outside. */
/** Brightening actives (vitamin C, tranexamic acid, Melasyl…) need about 4 weeks to show results. */
export const LONG_TERM_MIN_DAYS = 21;

export const isOutdoorish = (a: Activity[]) => has(a, "beach", "pool", "ski", "hiking", "festival");

/** Turn YouCam "health" scores (higher = better) into concern levels (higher = worse). */
export function concernLevels(s: SkinScores) {
  return {
    dryness: clamp(100 - s.moisture),
    oil: clamp(100 - s.oiliness),
    sensitivity: clamp(100 - s.redness),
    spots: clamp(100 - s.age_spot),
  };
}

/** Snow reflects up to ~80% of UV; water and sand also add exposure. */
export function uvMultiplier(activities: Activity[]) {
  if (has(activities, "ski")) return 1.5;
  if (has(activities, "beach", "pool")) return 1.15;
  return 1;
}

/** Normalise the climate into 0–100 stress factors. */
export function climateFactors(c: Climate, activities: Activity[]) {
  const effectiveUv = Math.min(12, c.uvMax * uvMultiplier(activities));
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

const avgTemp = (c: Climate) => (c.tempMinC + c.tempMaxC) / 2;

/** How much the destination differs from home. */
export function climateShift(origin: Climate | null, dest: Climate): ClimateShift | null {
  if (!origin) return null;
  return {
    fromName: origin.locationName,
    tempDeltaC: Math.round(avgTemp(dest) - avgTemp(origin)),
    humidityDelta: Math.round(dest.humidityPct - origin.humidityPct),
    uvDelta: Math.round((dest.uvMax - origin.uvMax) * 10) / 10,
  };
}

/** 0–100 factors for a sudden change of climate. */
export function shiftFactors(s: ClimateShift | null) {
  if (!s) return { colder: 0, drier: 0, sunnier: 0, shock: 0 };
  return {
    colder: clamp((-s.tempDeltaC / 15) * 100),
    drier: clamp((-s.humidityDelta / 30) * 100),
    sunnier: clamp((s.uvDelta / 6) * 100),
    shock: clamp((Math.abs(s.tempDeltaC) / 20) * 100),
  };
}

export function describeShift(s: ClimateShift) {
  const parts: string[] = [];
  if (Math.abs(s.tempDeltaC) >= 3) parts.push(`${Math.abs(s.tempDeltaC)}°C ${s.tempDeltaC < 0 ? "colder" : "warmer"}`);
  if (Math.abs(s.humidityDelta) >= 8) parts.push(`${Math.abs(s.humidityDelta)} pts ${s.humidityDelta < 0 ? "drier" : "more humid"}`);
  if (s.uvDelta >= 2) parts.push(`UV ${s.uvDelta} higher`);
  return parts.length ? `${parts.join(", ")} than ${s.fromName}` : `similar to ${s.fromName}`;
}

export function tierFor(score: number): Tier {
  if (score >= 70) return "must";
  if (score >= 50) return "recommended";
  if (score >= 35) return "optional";
  return "skip";
}

export const starsFor = (score: number) => Math.max(1, Math.min(5, Math.round(score / 20)));

/** Minimum sunscreen spec for the effective UV level and activities. */
export function sunscreenSpec(effectiveUv: number, activities: Activity[]) {
  const waterResistant = isOutdoorish(activities);
  const minSpf = effectiveUv >= 8 ? 50 : 30;
  const pa = effectiveUv >= 8 ? "PA++++" : "PA+++";
  const label = `SPF ${minSpf}+, ${pa}${waterResistant ? ", water-resistant" : ""}`;
  return { minSpf, waterResistant, label };
}

export const NEED_TITLES: Record<NeedId, string> = {
  sunscreen: "Sunscreen",
  barrier_cream: "Barrier repair cream",
  hydrating_serum: "Hydrating serum",
  gel_moisturizer: "Lightweight gel moisturizer",
  soothing: "Soothing / anti-redness care",
  brightening: "Brightening (vitamin C)",
  after_sun: "After-sun gel",
  gentle_cleanser: "Gentle cleanser",
  lip_care: "Lip repair",
  face_mist: "Hydrating face mist",
};

export function computeNeeds(skin: SkinScores, climate: Climate, trip: TripContext, origin: Climate | null = null): Need[] {
  const k = concernLevels(skin);
  const f = climateFactors(climate, trip.activities);
  const shift = climateShift(origin, climate);
  const sh = shiftFactors(shift);
  const outdoorish = isOutdoorish(trip.activities);
  const flying = trip.transport.includes("plane");
  const groundTransit = trip.transport.some((t) => t === "train" || t === "bus" || t === "car");
  const ski = trip.activities.includes("ski");
  const water = has(trip.activities, "beach", "pool");
  const needs: Need[] = [];

  const add = (id: NeedId, raw: number, reasons: (string | false | null)[], spec?: string) => {
    const score = Math.round(clamp(raw));
    needs.push({ id, title: NEED_TITLES[id], score, tier: tierFor(score), stars: starsFor(score), reasons: reasons.filter(Boolean) as string[], spec });
  };

  const spf = sunscreenSpec(f.effectiveUv, trip.activities);
  add(
    "sunscreen",
    45 + f.uv * 0.5 + (outdoorish ? 12 : 0) + k.spots * 0.08 + sh.sunnier * 0.1,
    [
      `Peak UV index ${climate.uvMax}${f.effectiveUv > climate.uvMax ? ` (feels like ${f.effectiveUv.toFixed(0)} with ${ski ? "snow" : "water and sand"} reflection)` : ""}`,
      shift && shift.uvDelta >= 2 && `UV is ${shift.uvDelta} points higher than at home`,
      outdoorish && "Long hours outdoors",
      k.spots >= 40 && "UV makes existing dark spots worse",
    ],
    spf.label,
  );

  add(
    "barrier_cream",
    k.dryness * 0.5 + f.dryAir * 0.3 + f.cold * 0.3 + sh.colder * 0.12 + sh.drier * 0.1 + (flying ? 8 : 0) - f.hot * 0.35 - k.oil * 0.15,
    [
      k.dryness >= 40 && `Your moisture score is low (${skin.moisture}/100)`,
      f.dryAir >= 40 && `Dry air at destination (${climate.humidityPct}% humidity)`,
      f.cold >= 40 && `Cold temperatures (down to ${climate.tempMinC}°C) weaken the skin barrier`,
      shift && (sh.colder >= 40 || sh.drier >= 40) && `Sudden change: ${describeShift(shift)}`,
      flying && "Cabin air on the flight is very dry",
    ],
  );

  add(
    "hydrating_serum",
    k.dryness * 0.55 + f.dryAir * 0.2 + f.cold * 0.1 + f.hot * 0.15 + sh.drier * 0.1 + (flying ? 12 : groundTransit ? 4 : 0),
    [
      k.dryness >= 40 && `Your moisture score is low (${skin.moisture}/100)`,
      f.hot >= 40 && "Heat and sun pull water out of the skin",
      flying && "Re-hydrate after the flight",
    ],
  );

  add(
    "gel_moisturizer",
    f.hot * 0.4 + f.humid * 0.35 + k.oil * 0.25 + k.dryness * 0.15,
    [
      f.hot >= 40 && `Hot weather (up to ${climate.tempMaxC}°C)`,
      f.humid >= 40 && `Humid air (${climate.humidityPct}%) — heavy creams can clog pores`,
      k.oil >= 40 && "Your skin tends to get oily",
    ],
  );

  add(
    "soothing",
    k.sensitivity * 0.55 + f.pollution * 0.25 + f.cold * 0.15 + f.uv * 0.15 + sh.shock * 0.12,
    [
      k.sensitivity >= 40 && `Your redness score shows sensitivity (${skin.redness}/100)`,
      f.pollution >= 30 && `Air quality is poor (US AQI up to ${climate.aqiMax})`,
      f.cold >= 40 && "Cold wind can trigger redness",
      sh.shock >= 50 && "Big temperature jumps can stress sensitive skin",
    ],
  );

  // Long-term brightening only makes sense when there is time for it to work before the trip.
  const tooSoon = trip.daysUntil != null && trip.daysUntil < LONG_TERM_MIN_DAYS;
  add("brightening", tooSoon ? Math.min(20, k.spots * 0.2) : k.spots * 0.5 + f.uv * 0.35, [
    k.spots >= 30 && `Dark spot score ${skin.age_spot}/100`,
    f.uv >= 60 && "Strong sun can deepen pigmentation",
    !tooSoon && trip.daysUntil != null && `${trip.daysUntil} days is enough time to start a brightening routine`,
  ]);

  add("after_sun", outdoorish ? f.uv * 0.7 + f.hot * 0.2 + k.sensitivity * 0.1 : f.uv * 0.3, [
    outdoorish && f.uv >= 50 && "Lots of sun exposure planned",
    k.sensitivity >= 40 && "Sensitive skin recovers slower from sun",
  ]);

  add("gentle_cleanser", 25 + f.pollution * 0.4 + k.sensitivity * 0.2 + (f.uv >= 60 ? 10 : 0) + (water ? 5 : 0), [
    f.pollution >= 30 && "Remove pollution particles every evening",
    f.uv >= 60 && "Removes water-resistant sunscreen",
    trip.activities.includes("pool") && "Rinse off pool chlorine",
  ]);

  add("lip_care", f.dryAir * 0.35 + f.cold * 0.45 + k.dryness * 0.2 + (ski ? 10 : 0) + sh.colder * 0.08, [
    f.cold >= 40 && "Cold, windy weather chaps lips",
    f.dryAir >= 40 && "Dry air",
  ]);

  add("face_mist", flying ? 40 + k.dryness * 0.3 + k.sensitivity * 0.15 : groundTransit ? 15 + k.dryness * 0.25 + f.hot * 0.15 : f.hot * 0.3, [
    flying && "Airplane cabins are around 10–20% humidity",
    !flying && groundTransit && "Air-conditioned trains, buses and cars dry out skin",
  ]);

  return needs.sort((a, b) => b.score - a.score);
}
