// Skin report: absolute YouCam scores + relative bands (InBody-style) + trip risk.
// Bands are SkinPassport reference ranges, not population norms (YouCam doesn't publish any).

import type { Activity, Band, Climate, ConcernReport, RiskLevel, SkinScores, Transport } from "../types";
import { climateFactors, climateShift, shiftFactors } from "./necessity";

export const BANDS = { weakBelow: 45, strongFrom: 70 } as const;

export function bandFor(score: number): Band {
  if (score < BANDS.weakBelow) return "weak";
  if (score < BANDS.strongFrom) return "normal";
  return "strong";
}

const riskFor = (v: number): RiskLevel => (v >= 60 ? "high" : v >= 35 ? "medium" : "low");

const LABELS: Record<ConcernReport["key"], string> = {
  moisture: "Moisture",
  oiliness: "Oil balance",
  redness: "Calmness (redness)",
  age_spot: "Even tone (spots)",
};

/**
 * Trip risk = how weak the skin is today × how hard the trip will push on it.
 * Without a climate yet, risk is based on the skin alone.
 */
export function buildReport(
  skin: SkinScores,
  climate: Climate | null,
  trip: { activities: Activity[]; transport: Transport[] },
  origin: Climate | null = null,
): ConcernReport[] {
  const f = climate ? climateFactors(climate, trip.activities) : null;
  const sh = climate ? shiftFactors(climateShift(origin, climate)) : null;
  const flying = trip.transport.includes("plane");

  const row = (key: ConcernReport["key"], stress: number, reasons: [number, string][]) => {
    const score = skin[key];
    const weakness = 100 - score;
    const value = f ? weakness * 0.55 + stress * 0.45 : weakness * 0.8;
    const top = reasons.filter(([v]) => v >= 35).sort((a, b) => b[0] - a[0])[0];
    const risk = riskFor(value);
    return {
      key,
      label: LABELS[key],
      score,
      band: bandFor(score),
      risk,
      riskReason: !f ? "Based on your skin today" : top ? top[1] : risk === "low" ? "The destination is easy on this" : "Mostly from your skin today",
    } satisfies ConcernReport;
  };

  if (!f || !climate || !sh) {
    return [row("moisture", 0, []), row("oiliness", 0, []), row("redness", 0, []), row("age_spot", 0, [])];
  }
  return [
    row("moisture", Math.max(f.dryAir, f.cold * 0.8, sh.drier, flying ? 55 : 0, f.hot * 0.5), [
      [f.dryAir, `Dry air (${climate.humidityPct}% humidity)`],
      [f.cold, `Cold (down to ${climate.tempMinC}°C)`],
      [sh.drier, "Much drier than home"],
      [flying ? 55 : 0, "Dry cabin air on the flight"],
    ]),
    row("oiliness", Math.max(f.hot * 0.8, f.humid), [
      [f.humid, `Humid air (${climate.humidityPct}%)`],
      [f.hot, `Heat (up to ${climate.tempMaxC}°C)`],
    ]),
    row("redness", Math.max(f.uv * 0.6, f.cold * 0.7, f.pollution, sh.shock * 0.8), [
      [f.uv * 0.6, `Strong sun (UV ${climate.uvMax})`],
      [f.cold * 0.7, "Cold wind"],
      [f.pollution, `Air quality (AQI ${climate.aqiMax})`],
      [sh.shock * 0.8, "Big temperature change"],
    ]),
    row("age_spot", f.uv, [[f.uv, `UV up to ${f.effectiveUv.toFixed(0)}`]]),
  ];
}
