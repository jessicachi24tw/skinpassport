import { describe, expect, it } from "vitest";
import { normalizeResult } from "../youcam";
import { searchCountries, searchLocalCities } from "../../places";
import { pm25ToUsAqi } from "../weather";

describe("YouCam result normalization", () => {
  it("reads the skin type for the whole face and each zone", () => {
    const skin = normalizeResult({
      output: [
        { type: "pore", ui_score: 61 },
        { type: "skin_type", whole: { skin_type: "combination_redness" }, t_zone: { skin_type: "oily" }, u_zone: { skin_type: "dry" } },
      ],
    });
    expect(skin.scores.pore).toBe(61);
    expect(skin.skinType).toEqual({ whole: "Combination & Redness", tZone: "Oily", uZone: "Dry" });
  });

  it("reads a flat skin type label too", () => {
    expect(normalizeResult({ output: [{ type: "skin_type", label: "Dry" }] }).skinType?.whole).toBe("Dry");
  });

  it("maps ui_score per concern plus overall and skin age", () => {
    const skin = normalizeResult({
      output: [
        { type: "moisture", ui_score: 31, mask_urls: ["https://example.com/moisture_output.png"] },
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
    expect(skin.masks).toEqual({ moisture: "https://example.com/moisture_output.png" });
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

describe("clear-sky UV estimate", () => {
  it("is high near the equator and low in a northern winter", async () => {
    const { estimateClearSkyUv } = await import("../weather");
    expect(estimateClearSkyUv(25.8, "2026-07-15")).toBeGreaterThan(10); // Miami, July
    expect(estimateClearSkyUv(40.7, "2027-01-15")).toBeLessThan(3); // New York, January
  });
});

describe("shelf guessing", () => {
  it("detects category, SPF and sun-sensitizing actives from a name", async () => {
    const { fromText, guessNeeds } = await import("../../shelf");
    expect(guessNeeds("Anthelios Melt-in Milk Sunscreen SPF 60")).toEqual(["sunscreen"]);
    expect(guessNeeds("Hydrating Facial Cleanser")).toEqual(["gentle_cleanser"]);
    expect(guessNeeds("Lip Sleeping Mask")).toEqual(["lip_care"]);
    const p = fromText("Retinol Serum 0.3", "Brand");
    expect(p.photosensitizing).toBe(true);
    expect(p.needs).toEqual([]); // a treatment, not a hydrating serum
    expect(p.treatment).toBe(true);
    expect(fromText("UV Clear SPF 46", "EltaMD").spf).toBe(46);
  });
});
