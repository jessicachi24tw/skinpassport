// Which concerns to show improved in the YouCam AI Skin Simulation, and how much.
// Only concerns that the user's chosen products actually address are simulated,
// that are not already Strong, scaled by how weak the score is today and capped at YouCam's "balanced" range
// (0.6) so the picture stays realistic. This is a visualization, not a promise.

import type { ConcernKey, ConcernReport, NeedId } from "../types";
import { LONG_TERM_MIN_DAYS, NEED_TITLES } from "./necessity";

/** YouCam AI Skin Simulation parameters. */
export type SimKey = "wrinkle" | "radiance" | "oiliness" | "acne" | "eye_bags" | "dark_circle" | "spots" | "pores" | "texture" | "redness";

/** For each simulation concern: the matching YouCam score, and the product types that help (with how strongly). */
const SIM_MAP: { key: SimKey; score: ConcernKey; label: string; by: [NeedId, number][] }[] = [
  { key: "texture", score: "texture", label: "Texture", by: [["exfoliant", 1], ["hydrating_serum", 0.8], ["barrier_cream", 0.8]] },
  { key: "radiance", score: "radiance", label: "Radiance", by: [["hydrating_serum", 1], ["brightening", 1], ["barrier_cream", 0.6]] },
  { key: "redness", score: "redness", label: "Redness", by: [["soothing", 1], ["barrier_cream", 0.6]] },
  { key: "oiliness", score: "oiliness", label: "Shine", by: [["gel_moisturizer", 1], ["gentle_cleanser", 0.6]] },
  { key: "pores", score: "pore", label: "Pores", by: [["pore_serum", 1], ["gel_moisturizer", 0.6], ["gentle_cleanser", 0.6]] },
  { key: "acne", score: "acne", label: "Blemishes", by: [["blemish_care", 1], ["gentle_cleanser", 0.6], ["soothing", 0.6]] },
  { key: "wrinkle", score: "wrinkle", label: "Fine lines", by: [["line_smoothing", 1], ["hydrating_serum", 0.5]] },
  { key: "spots", score: "age_spot", label: "Dark spots", by: [["brightening", 1]] },
  // The eye area is not simulated: the plan has no product for it.
];

export const SIM_MAX = 0.6;

export interface SimPlan {
  intensities: Partial<Record<SimKey, number>>;
  /** What changes, for the caption. */
  lines: { key: SimKey; label: string; intensity: number; by: string[] }[];
}

export function simulationPlan(report: ConcernReport[], covered: Set<NeedId>, daysUntil: number | null): SimPlan {
  const lines: SimPlan["lines"] = [];
  for (const m of SIM_MAP) {
    const r = report.find((x) => x.key === m.score);
    if (!r || r.band === "strong") continue; // already in the Strong range: nothing worth simulating
    // Brightening needs about 4 weeks before it shows.
    const helpers = m.by.filter(([n]) => covered.has(n) && !(n === "brightening" && daysUntil != null && daysUntil < LONG_TERM_MIN_DAYS));
    if (!helpers.length) continue;
    const strength = Math.max(...helpers.map(([, w]) => w));
    const weakness = (100 - r.score) / 100;
    const v = Math.min(SIM_MAX, Math.round((0.15 + weakness * 0.6) * strength * 100) / 100);
    if (v < 0.1) continue;
    lines.push({ key: m.key, label: m.label, intensity: v, by: helpers.map(([n]) => NEED_TITLES[n]) });
  }
  lines.sort((a, b) => b.intensity - a.intensity);
  return { intensities: Object.fromEntries(lines.map((l) => [l.key, l.intensity])), lines };
}

export const intensityWord = (v: number) => (v >= 0.4 ? "Visible" : v >= 0.25 ? "Moderate" : "Subtle");

/** Stable cache key for a simulation request. */
export const simKey = (photoId: string, intensities: SimPlan["intensities"]) =>
  `${photoId}|${Object.entries(intensities)
    .sort()
    .map(([k, v]) => `${k}:${v}`)
    .join(",")}`;
