// Skin report: absolute YouCam scores + relative bands (InBody-style) + trip risk.
// Covers the 8 YouCam SD scores we request, grouped for display.
// Bands are SkinPassport reference ranges, not population norms (YouCam doesn't publish any).

import type { Activity, Band, Climate, ConcernGroup, ConcernKey, ConcernReport, RiskLevel, SkinScores, Transport } from "../types";
import { climateFactors, climateShift, shiftFactors } from "./necessity";

export const BANDS = { weakBelow: 45, strongFrom: 70 } as const;

export function bandFor(score: number): Band {
  if (score < BANDS.weakBelow) return "weak";
  if (score < BANDS.strongFrom) return "normal";
  return "strong";
}

const riskFor = (v: number): RiskLevel => (v >= 60 ? "high" : v >= 35 ? "medium" : "low");

/** Display order, label and group of every concern. The first four are the travel-sensitive core. */
export const CONCERNS: { key: ConcernKey; label: string; group: ConcernGroup }[] = [
  { key: "moisture", label: "Moisture", group: "hydration" },
  { key: "oiliness", label: "Oil balance", group: "clarity" },
  { key: "redness", label: "Calmness (redness)", group: "tone" },
  { key: "age_spot", label: "Even tone (spots)", group: "tone" },
  { key: "texture", label: "Texture", group: "hydration" },
  { key: "radiance", label: "Radiance", group: "hydration" },
  { key: "pore", label: "Pores", group: "clarity" },
  { key: "acne", label: "Clear skin (acne)", group: "clarity" },
  { key: "wrinkle", label: "Smoothness (fine lines)", group: "lines" },
];
export const CORE: ConcernKey[] = ["moisture", "oiliness", "redness", "age_spot"];

export const GROUP_LABEL: Record<ConcernGroup, string> = {
  hydration: "Hydration & glow",
  clarity: "Oil & clarity",
  tone: "Tone & calm",
  lines: "Fine lines",
};

export const labelOf = (k: ConcernKey) => CONCERNS.find((c) => c.key === k)?.label ?? k;

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

  // Stress the trip puts on each concern (0 to 100) and the reasons behind it.
  const stress = (key: ConcernKey): [number, string][] => {
    if (!f || !climate || !sh) return [];
    const dry: [number, string][] = [
      [f.dryAir, `Dry air (${climate.humidityPct}% humidity)`],
      [f.cold * 0.8, `Cold (down to ${climate.tempMinC}°C)`],
      [sh.drier, "Much drier than home"],
      [flying ? 55 : 0, "Dry cabin air on the flight"],
    ];
    const oily: [number, string][] = [
      [f.humid, `Humid air (${climate.humidityPct}%)`],
      [f.hot * 0.8, `Heat (up to ${climate.tempMaxC}°C)`],
    ];
    const sun: [number, string][] = [[f.uv, `UV up to ${f.effectiveUv.toFixed(0)}`]];
    switch (key) {
      case "moisture":
        return [...dry, [f.hot * 0.5, `Heat (up to ${climate.tempMaxC}°C)`]];
      case "texture":
        return dry.map(([v, r]) => [v * 0.8, r]);
      case "radiance":
        return [...dry.map(([v, r]) => [v * 0.7, r] as [number, string]), [f.pollution, `Air quality (AQI ${climate.aqiMax})`]];
      case "oiliness":
        return oily;
      case "pore":
        return oily.map(([v, r]) => [v * 0.9, r]);
      case "acne":
        return [...oily.map(([v, r]) => [v * 0.8, r] as [number, string]), [f.pollution, `Air quality (AQI ${climate.aqiMax})`]];
      case "redness":
        return [
          [f.uv * 0.6, `Strong sun (UV ${climate.uvMax})`],
          [f.cold * 0.7, "Cold wind"],
          [f.pollution, `Air quality (AQI ${climate.aqiMax})`],
          [sh.shock * 0.8, "Big temperature change"],
        ];
      case "age_spot":
        return sun;
      case "wrinkle":
        return [...sun.map(([v, r]) => [v * 0.6, r] as [number, string]), [Math.max(f.dryAir, f.cold) * 0.6, "Dry, cold air shows fine lines"]];
      default:
        return [];
    }
  };

  const out: ConcernReport[] = [];
  for (const c of CONCERNS) {
    const score = skin[c.key];
    if (typeof score !== "number") continue;
    const reasons = stress(c.key);
    const load = reasons.reduce((m, [v]) => Math.max(m, v), 0);
    const weakness = 100 - score;
    const value = f ? weakness * 0.55 + load * 0.45 : weakness * 0.8;
    const top = reasons.filter(([v]) => v >= 35).sort((a, b) => b[0] - a[0])[0];
    const risk = riskFor(value);
    out.push({
      key: c.key,
      group: c.group,
      label: c.label,
      score,
      band: bandFor(score),
      risk,
      riskReason: !f ? "Based on your skin today" : top ? top[1] : risk === "low" ? "The destination is easy on this" : "Mostly from your skin today",
    });
  }
  return out;
}
