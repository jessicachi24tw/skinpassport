import { describe, expect, it } from "vitest";
import { normalizeResult } from "../youcam";
import { parseTripHeuristic } from "../llm";
import { pm25ToUsAqi } from "../weather";

describe("YouCam result normalization", () => {
  it("maps ui_score per concern plus overall and skin age", () => {
    const skin = normalizeResult({
      output: [
        { type: "moisture", ui_score: 31 },
        { type: "redness", ui_score: 55 },
        { type: "all", score: 63.4 },
        { type: "skin_age", score: 28.6 },
        { type: "resize_image" },
      ],
    });
    expect(skin.scores.moisture).toBe(31);
    expect(skin.scores.redness).toBe(55);
    expect(skin.scores.oiliness).toBe(60); // neutral fallback
    expect(skin.overall).toBe(63);
    expect(skin.skinAge).toBe(29);
  });
});

describe("trip text fallback parser", () => {
  const today = new Date("2026-10-26T12:00:00");
  it("parses an English trip", () => {
    const t = parseTripHeuristic("Ski trip to Hokkaido next week for 4 days", today);
    expect(t).toMatchObject({ activity: "ski", days: 4, destination: "Hokkaido", startDate: "2026-11-02" });
  });
  it("parses a Chinese trip", () => {
    const t = parseTripHeuristic("下週去北海道滑雪 4 天", today);
    expect(t).toMatchObject({ activity: "ski", days: 4, destination: "Sapporo, Japan" });
  });
});

describe("PM2.5 to US AQI", () => {
  it("matches EPA breakpoints", () => {
    expect(pm25ToUsAqi(0)).toBe(0);
    expect(pm25ToUsAqi(35.4)).toBe(100);
    expect(pm25ToUsAqi(55.4)).toBe(150);
  });
});
