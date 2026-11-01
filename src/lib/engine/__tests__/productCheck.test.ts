import { describe, expect, it } from "vitest";
import { guessTypes, parseInci, statedPercentages } from "../inci";
import { checkProduct, productFromFound } from "../productCheck";
import { computeNeeds, climateFactors } from "../necessity";
import { buildRecommendations } from "../recommend";
import { buildReport } from "../report";
import { catalogProvider } from "../../shop/provider";
import { DEMO_ORIGIN_CLIMATE, DEMO_SKIN, getScenario } from "../scenarios";
import type { PlanResult } from "../../types";

describe("INCI parser", () => {
  it("finds known ingredients, synonyms and fragrance", () => {
    const p = parseInci("Aqua, Glycerin, Niacinamide, Sodium Hyaluronate, Capryloyl Salicylic Acid, Butyrospermum Parkii Butter, Tocopherol, Parfum, Linalool");
    expect(p.ingredients).toEqual(["glycerin", "niacinamide", "hyaluronic_acid", "lha", "shea_butter", "vitamin_e"]);
    expect(p.fragrance).toBe(true);
  });

  it("reads percentages the name states", () => {
    expect(statedPercentages("Niacinamide 10% + Zinc 1%")).toEqual([
      { ingredient: "niacinamide", pct: 10 },
      { ingredient: "zinc", pct: 1 },
    ]);
    expect(statedPercentages("Revitalift 0.3% Pure Retinol Night Serum")).toEqual([{ ingredient: "retinoid", pct: 0.3 }]);
  });

  it("guesses the product type", () => {
    expect(guessTypes("Supergoop Unseen Sunscreen SPF 40", [])[0]).toBe("sunscreen");
    expect(guessTypes("Clinique Moisture Surge 100H Auto-Replenishing Hydrator", ["hyaluronic_acid"])[0]).toBe("gel_moisturizer");
    expect(guessTypes("Some Gel Cream", ["hyaluronic_acid"])[0]).toBe("gel_moisturizer");
  });
});

describe("product check", () => {
  const plan = async (id: string) => {
    const s = getScenario(id)!;
    const trip = { activities: s.activities, transport: ["plane" as const], days: 4, daysUntil: 10 };
    const needs = computeNeeds(DEMO_SKIN.scores, s.climate, trip, DEMO_ORIGIN_CLIMATE, DEMO_SKIN.skinType);
    const f = climateFactors(s.climate, s.activities);
    const items = await buildRecommendations(needs, catalogProvider, { sensitive: true, effectiveUv: f.effectiveUv, activities: s.activities }, []);
    const report = buildReport(DEMO_SKIN.scores, s.climate, trip, DEMO_ORIGIN_CLIMATE);
    const p: PlanResult = { needs, items, shift: null, report, summary: [], summarySource: "template", warnings: [] };
    return { s, trip, p };
  };
  const run = async (id: string, found: Parameters<typeof productFromFound>[0]) => {
    const { s, trip, p } = await plan(id);
    const { product } = productFromFound(found);
    return checkProduct({ product, plan: p, budget: "balanced", climate: s.climate, trip, scores: DEMO_SKIN.scores, skinType: DEMO_SKIN.skinType ?? null, bag: [], ownedNeeds: [], preferredBrands: [] });
  };

  it("an SPF 30 sunscreen is not for Miami", async () => {
    const r = await run("miami-uv", { source: "pasted", brand: "Brand", name: "Daily Sunscreen SPF 30", ingredientsText: "Water, Avobenzone, Homosalate, Octocrylene, Glycerin, Tocopherol", sourceUrl: "" });
    expect(r.verdict).toBe("not_for_trip");
    expect(r.blockers.join(" ")).toMatch(/SPF 30 is too low/);
  });

  it("a retinol is not for a sunny trip", async () => {
    const r = await run("miami-uv", { source: "pasted", brand: "Brand", name: "Retinol 0.5% Night Serum", ingredientsText: "Water, Glycerin, Squalane, Retinol, Tocopherol, Phenoxyethanol", sourceUrl: "" });
    expect(r.verdict).toBe("not_for_trip");
  });

  it("a fragrance-free ceramide cream can swap in for New York", async () => {
    const r = await run("nyc-winter", {
      source: "pasted",
      brand: "Vanicream",
      name: "Daily Facial Moisturizer with Ceramides",
      ingredientsText: "Water, Glycerin, Squalane, Ceramide NP, Ceramide AP, Ceramide EOP, Cholesterol, Sodium Hyaluronate, Niacinamide, Phenoxyethanol",
      sourceUrl: "",
    });
    expect(r.need.id).toBe("barrier_cream");
    expect(["swap_in", "add"]).toContain(r.verdict);
    expect(r.ours).not.toBeNull();
  });

  it("a brightening serum 10 days out is saved for after the trip", async () => {
    const r = await run("nyc-winter", { source: "pasted", brand: "Brand", name: "Vitamin C Brightening Serum", ingredientsText: "Water, Ascorbic Acid, Ferulic Acid, Tocopherol, Glycerin, Phenoxyethanol", sourceUrl: "" });
    expect(r.verdict).toBe("not_needed");
  });
});
