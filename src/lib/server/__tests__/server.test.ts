import { describe, expect, it } from "vitest";
import { normalizeResult } from "../youcam";
import { searchCountries, searchLocalCities } from "../../places";
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

describe("place search", () => {
  it("finds US cities by prefix", () => {
    const names = searchLocalCities("new", "US").map((p) => p.name);
    expect(names.slice(0, 4)).toEqual(expect.arrayContaining(["New York", "New Orleans"]));
    expect(names).toContain("Newark");
  });
  it("finds countries by prefix", () => {
    expect(searchCountries("uni").map((c) => c.code)).toEqual(expect.arrayContaining(["US", "GB", "AE"]));
  });
});

describe("PM2.5 to US AQI", () => {
  it("matches EPA breakpoints", () => {
    expect(pm25ToUsAqi(0)).toBe(0);
    expect(pm25ToUsAqi(35.4)).toBe(100);
    expect(pm25ToUsAqi(55.4)).toBe(150);
  });
});
