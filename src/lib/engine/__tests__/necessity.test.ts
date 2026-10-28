import { describe, expect, it } from "vitest";
import { climateFactors, climateShift, computeNeeds, describeShift, sunscreenSpec, tierFor } from "../necessity";
import { buildRecommendations, checkOwned, resolveTier } from "../recommend";
import { bandFor, buildReport } from "../report";
import { productReasons, productCautions } from "../reasons";
import { buildActionPlan } from "../actionPlan";
import { catalogProvider } from "../../shop/provider";
import { CATALOG, getProduct } from "../../shop/catalog";
import { DEMO_ORIGIN, DEMO_ORIGIN_CLIMATE, DEMO_SKIN, getScenario } from "../scenarios";
import type { OwnedProduct, Transport, TripInput } from "../../types";

const ctxFor = (id: string, extra: Partial<{ preferredBrands: string[] }> = {}) => {
  const s = getScenario(id)!;
  const f = climateFactors(s.climate, s.activities);
  return { sensitive: true, effectiveUv: f.effectiveUv, activities: s.activities, ...extra };
};

const run = async (id: string, transport: Transport[] = ["plane"], daysUntil?: number, owned: OwnedProduct[] = []) => {
  const s = getScenario(id)!;
  const trip = { activities: s.activities, transport, days: s.days, daysUntil };
  const needs = computeNeeds(DEMO_SKIN.scores, s.climate, trip, DEMO_ORIGIN_CLIMATE);
  const items = await buildRecommendations(needs, catalogProvider, ctxFor(id, { preferredBrands: owned.map((o) => o.brand) }), owned);
  const byId = Object.fromEntries(needs.map((n) => [n.id, n]));
  const report = buildReport(DEMO_SKIN.scores, s.climate, trip, DEMO_ORIGIN_CLIMATE);
  return { s, trip, needs, items, byId, report };
};

describe("necessity engine", () => {
  it("maps scores to tiers", () => {
    expect(tierFor(90)).toBe("must");
    expect(tierFor(60)).toBe("recommended");
    expect(tierFor(40)).toBe("optional");
    expect(tierFor(10)).toBe("skip");
  });

  it("asks for SPF 50+ water-resistant under strong beach sun", () => {
    const spec = sunscreenSpec(12, ["beach"]);
    expect(spec.minSpf).toBe(50);
    expect(spec.waterResistant).toBe(true);
  });

  it("New York winter: barrier and hydration are must-pack, SPF 30 is enough", async () => {
    const r = await run("nyc-winter");
    expect(r.byId.barrier_cream.tier).toBe("must");
    expect(r.byId.hydrating_serum.tier).toBe("must");
    expect(r.items.find((i) => i.need.id === "sunscreen")?.options.value?.spf).toBe(30);
    expect(r.byId.gel_moisturizer.tier).toBe("skip");
  });

  it("Miami: every tier's sunscreen is SPF 50+ and water-resistant", async () => {
    const r = await run("miami-uv");
    const sun = r.items.find((i) => i.need.id === "sunscreen")!;
    for (const t of ["value", "balanced", "premium"] as const) {
      expect(sun.options[t]?.spf).toBeGreaterThanOrEqual(50);
      expect(sun.options[t]?.waterResistant).toBe(true);
    }
    expect(r.byId.barrier_cream.tier).toBe("skip");
  });

  it("compares the destination with home", () => {
    const shift = climateShift(DEMO_ORIGIN_CLIMATE, getScenario("nyc-winter")!.climate)!;
    expect(shift.tempDeltaC).toBeLessThan(-20);
    expect(describeShift(shift)).toMatch(/colder.*drier than Taipei/);
  });

  it("drops long-term brightening when the trip is too close", async () => {
    const soon = await run("miami-uv", ["plane"], 6);
    const later = await run("miami-uv", ["plane"], 40);
    expect(soon.byId.brightening.tier).toBe("skip");
    expect(later.byId.brightening.tier).not.toBe("skip");
  });

  it("never lists the same product twice per tier (multi-use shows coveredBy)", async () => {
    for (const id of ["nyc-winter", "miami-uv", "hokkaido-ski"]) {
      const { items } = await run(id);
      for (const tier of ["value", "balanced", "premium"] as const) {
        const ids = resolveTier(items, tier).filter((i) => !i.coveredBy).map((i) => i.product?.id).filter(Boolean);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });
});

describe("catalog", () => {
  it("is L'Oréal-first and every product has verified ingredients and a source", () => {
    const loreal = CATALOG.filter((p) => p.loreal).length;
    expect(loreal / CATALOG.length).toBeGreaterThan(0.8);
    for (const p of CATALOG) {
      expect(p.ingredients.length).toBeGreaterThan(0);
      expect(p.ingredientSource).toMatch(/^https:\/\//);
    }
  });
});

describe("skin report", () => {
  it("uses Weak <45, Normal 45–69, Strong ≥70", () => {
    expect(bandFor(32)).toBe("weak");
    expect(bandFor(54)).toBe("normal");
    expect(bandFor(78)).toBe("strong");
  });

  it("flags high moisture risk for dry skin going to a dry, cold city", async () => {
    const { report } = await run("nyc-winter");
    const m = report.find((r) => r.key === "moisture")!;
    expect(m.band).toBe("weak");
    expect(m.risk).toBe("high");
  });
});

describe("ingredient reasons", () => {
  it("explains a pick through the user's weak score and a verified ingredient", async () => {
    const { s, trip, report, byId } = await run("nyc-winter");
    const reasons = productReasons(getProduct("cerave-cream")!, byId.barrier_cream, report, s.climate, trip);
    expect(reasons[0]).toMatch(/\*\*Moisture\*\* is \*\*Weak \(32\)\*\*/);
    expect(reasons.join(" ")).toMatch(/Ceramides|Hyaluronic Acid/);
  });

  it("shows the SPF spec first for sunscreens", async () => {
    const { s, trip, report, byId } = await run("miami-uv");
    const reasons = productReasons(getProduct("lrp-anthelios-60")!, byId.sunscreen, report, s.climate, trip);
    expect(reasons[0]).toMatch(/SPF 60, water-resistant/);
  });

  it("warns about retinoids under strong sun", () => {
    const s = getScenario("miami-uv")!;
    const c = productCautions(getProduct("lrp-mela-b3")!, s.climate, { activities: s.activities, transport: [], days: 4 });
    expect(c.join(" ")).toMatch(/retinoid.*UV/i);
  });
});

describe("owned products", () => {
  const owned: OwnedProduct = { id: "x", name: "AM Facial Moisturizing Lotion SPF 30", brand: "CeraVe", needs: ["sunscreen"], spf: 30, waterResistant: false, source: "catalog" };

  it("flags an owned SPF 30 as too low for Miami", async () => {
    const r = await run("miami-uv", ["plane"], 10, [owned]);
    const sun = r.items.find((i) => i.need.id === "sunscreen")!;
    expect(sun.owned[0].meetsSpec).toBe(false);
    expect(checkOwned(owned, r.byId.sunscreen, ctxFor("miami-uv")).note).toMatch(/SPF 30/);
  });

  it("prefers the brand the user already uses", async () => {
    const cerave: OwnedProduct = { ...owned, needs: ["gentle_cleanser"], name: "Foaming Cleanser" };
    const withBrand = await run("nyc-winter", ["plane"], 10, [cerave]);
    const serum = withBrand.items.find((i) => i.need.id === "barrier_cream")!;
    expect(serum.options.value?.brand).toBe("CeraVe");
  });
});

describe("action plan", () => {
  const trip = (startDate: string): TripInput => ({
    origin: DEMO_ORIGIN,
    destination: getScenario("miami-uv")!.place,
    startDate,
    days: 4,
    transport: ["plane"],
    activities: ["beach"],
    notes: "",
  });

  it("starts a brightening serum only when there are 4+ weeks", async () => {
    const { s, report } = await run("miami-uv");
    const bright = getProduct("garnier-vitc")!;
    const far = buildActionPlan({ trip: trip("2026-12-15"), daysUntil: 40, climate: s.climate, origin: DEMO_ORIGIN_CLIMATE, report, bag: [bright], owned: [], ownedNeeds: [] });
    const near = buildActionPlan({ trip: trip("2026-11-03"), daysUntil: 6, climate: s.climate, origin: DEMO_ORIGIN_CLIMATE, report, bag: [], owned: [], ownedNeeds: [] });
    expect(far.before.map((b) => b.text).join(" ")).toMatch(/Start \*\*Garnier/);
    expect(near.before.map((b) => b.text).join(" ")).toMatch(/too short for a brightening serum/);
  });

  it("keeps retinol out of the daytime routine and says when to pause it", async () => {
    const { s, report } = await run("miami-uv");
    const retinol: OwnedProduct = { id: "r", name: "Retinol Night Serum", brand: "", needs: [], photosensitizing: true, treatment: true, source: "manual" };
    const plan = buildActionPlan({ trip: trip("2026-11-10"), daysUntil: 13, climate: s.climate, origin: null, report, bag: [], owned: [retinol], ownedNeeds: [] });
    const morning = plan.during.find((d) => d.title === "Every morning")!.steps.join(" ");
    expect(morning).not.toMatch(/Retinol/);
    expect(plan.before.map((b) => b.text).join(" ")).toMatch(/Pause \*\*Retinol Night Serum\*\*/);
    expect(plan.shopping.fromHome).not.toContain("Retinol Night Serum");
  });

  it("lists owned items in the shopping list without a price", async () => {
    const { s, report } = await run("miami-uv");
    const plan = buildActionPlan({
      trip: trip("2026-11-10"),
      daysUntil: 13,
      climate: s.climate,
      origin: null,
      report,
      bag: [getProduct("lrp-anthelios-60")!],
      owned: [],
      ownedNeeds: ["lip_care"],
    });
    expect(plan.shopping.totalUsd).toBe(38);
    expect(plan.shopping.fromHome).toEqual(["your lip repair"]);
    expect(plan.during.find((d) => d.title === "Every morning")!.steps.join(" ")).toMatch(/Anthelios/);
  });
});
