import { describe, expect, it } from "vitest";
import { climateFactors, climateShift, computeNeeds, describeShift, sunscreenSpec, tierFor } from "../necessity";
import { buildRecommendations, checkOwned, resolveTier } from "../recommend";
import { bandFor, buildReport } from "../report";
import { productReasons, productCautions } from "../reasons";
import { buildActionPlan } from "../actionPlan";
import { SIM_MAX, simulationPlan } from "../simulation";
import { strengthOf } from "../concentration";
import { fitScore } from "../../shop/provider";
import { groupOf } from "../../shop/brandGroups";
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
    const morning = plan.during.find((d) => d.id === "am")!.steps.map((s) => s.item?.name ?? "").join(" ");
    expect(morning).not.toMatch(/Retinol/);
    expect(plan.before.map((b) => b.text).join(" ")).toMatch(/Pause \*\*Retinol Night Serum\*\*/);
    expect(plan.during.find((d) => d.id === "tips")!.steps.map((s) => s.text).join(" ")).toMatch(/Leave \*\*Retinol Night Serum\*\* at home/);
  });

  it("uses bag products (with photos) and owned items in the routine", async () => {
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
    const sun = plan.during.find((d) => d.id === "am")!.steps.find((s) => s.icon === "☀️")!;
    expect(sun.item?.productId).toBe("lrp-anthelios-60");
    expect(sun.text).toMatch(/SPF 50\+/);
    expect(plan.during.find((d) => d.id === "travel")!.steps.some((s) => s.item?.name === "your lip repair")).toBe(true);
  });

  it("never uses em dashes in plan text", async () => {
    const { s, report } = await run("nyc-winter");
    const plan = buildActionPlan({ trip: { ...trip("2026-11-10"), destination: s.place }, daysUntil: 3, climate: s.climate, origin: DEMO_ORIGIN_CLIMATE, report, bag: CATALOG.slice(0, 6), owned: [], ownedNeeds: [] });
    const all = [...plan.before.map((b) => b.text + b.when), ...plan.during.flatMap((g) => [g.title, ...g.steps.map((x) => x.text)])].join(" ");
    expect(all).not.toMatch(/—/);
  });
});

describe("YouCam analysis scope", () => {
  it("reports the 9 measures, grouped", async () => {
    const { report } = await run("nyc-winter");
    expect(report.map((r) => r.key).sort()).toEqual(["acne", "age_spot", "moisture", "oiliness", "pore", "radiance", "redness", "texture", "wrinkle"]);
    expect(report.find((r) => r.key === "pore")?.group).toBe("clarity");
  });
});

describe("skin type", () => {
  const s = () => getScenario("miami-uv")!;
  const trip = { activities: ["beach" as const], transport: ["plane" as const], days: 4 };

  it("oily skin raises the gel moisturizer, dry skin the barrier cream", () => {
    const oily = computeNeeds(DEMO_SKIN.scores, s().climate, trip, null, { whole: "Oily" });
    const dry = computeNeeds(DEMO_SKIN.scores, s().climate, trip, null, { whole: "Dry" });
    const score = (n: ReturnType<typeof computeNeeds>, id: string) => n.find((x) => x.id === id)!.score;
    expect(score(oily, "gel_moisturizer")).toBeGreaterThan(score(dry, "gel_moisturizer"));
    expect(score(dry, "barrier_cream")).toBeGreaterThan(score(oily, "barrier_cream"));
  });

  it("redness-prone types always get soothing care as a must-pack", () => {
    const n = computeNeeds({ ...DEMO_SKIN.scores, redness: 90 }, s().climate, trip, null, { whole: "Oily & Redness" });
    expect(n.find((x) => x.id === "soothing")!.tier).toBe("must");
  });

  it("combination skin gets zone advice in the plan", async () => {
    const { report } = await run("miami-uv");
    const plan = buildActionPlan({
      trip: { origin: DEMO_ORIGIN, destination: s().place, startDate: "2026-11-20", days: 4, transport: ["plane"], activities: ["beach"], notes: "" },
      daysUntil: 20,
      climate: s().climate,
      origin: null,
      report,
      bag: [],
      owned: [],
      ownedNeeds: [],
      skinType: { whole: "Combination", tZone: "Oily", uZone: "Dry" },
    });
    expect(plan.during.find((d) => d.id === "tips")!.steps.map((x) => x.text).join(" ")).toMatch(/T-zone/);
  });

  it("explains a light texture for combination skin", async () => {
    const { s: sc, trip: t, report, byId } = await run("miami-uv");
    const r = productReasons(getProduct("neutrogena-hydro-boost")!, byId.gel_moisturizer, report, sc.climate, t, 4, { whole: "Combination" });
    expect(r.join(" ")).toMatch(/Combination.*T-zone/);
  });
});

describe("skin simulation", () => {
  it("only simulates weak/normal concerns that the chosen products address, capped", async () => {
    const { report } = await run("nyc-winter");
    const none = simulationPlan(report, new Set(), 10);
    expect(none.lines).toEqual([]);
    const p = simulationPlan(report, new Set(["hydrating_serum", "barrier_cream"]), 10);
    const keys = p.lines.map((l) => l.key);
    expect(keys).toContain("texture"); // 58, Normal
    expect(keys).toContain("radiance"); // 49
    expect(keys).not.toContain("oiliness"); // 78 is Strong and not addressed
    expect(Math.max(...p.lines.map((l) => l.intensity))).toBeLessThanOrEqual(SIM_MAX);
  });

  it("does not simulate fading dark spots when the trip is too close for brightening", async () => {
    const { report } = await run("miami-uv");
    const weakSpots = report.map((r) => (r.key === "age_spot" ? { ...r, score: 40, band: "weak" as const } : r));
    expect(simulationPlan(weakSpots, new Set(["brightening"]), 6).lines.map((l) => l.key)).not.toContain("spots");
    expect(simulationPlan(weakSpots, new Set(["brightening"]), 40).lines.map((l) => l.key)).toContain("spots");
  });
});

describe("targeted care, cleansers, strength and brands", () => {
  const miami = () => getScenario("miami-uv")!;
  const trip = { activities: ["beach" as const], transport: ["plane" as const], days: 4 };
  const need = (id: string, skin = DEMO_SKIN.scores, type = DEMO_SKIN.skinType ?? null) =>
    computeNeeds(skin, miami().climate, trip, null, type).find((n) => n.id === id)!;

  it("visible pores in a hot, humid place call for a pore serum", () => {
    expect(need("pore_serum").tier).not.toBe("skip");
    expect(need("pore_serum", { ...DEMO_SKIN.scores, pore: 90 }).tier).toBe("skip");
  });

  it("strong sun pulls the exfoliant down", () => {
    const nyc = computeNeeds(DEMO_SKIN.scores, getScenario("nyc-winter")!.climate, { ...trip, activities: ["city"] }, null).find((n) => n.id === "exfoliant")!;
    expect(need("exfoliant", DEMO_SKIN.scores, null).score).toBeLessThan(nyc.score);
  });

  it("only uses percentages the brand states, and grades them", () => {
    const to = getProduct("ordinary-niacinamide-10")!;
    expect(strengthOf(to.concentrations![0])).toBe("high");
    expect(strengthOf(getProduct("cerave-acne-control-cleanser")!.concentrations![0])).toBe("standard");
    expect(getProduct("cerave-foaming-cleanser")!.concentrations).toBeUndefined();
  });

  it("reactive skin ranks 10% niacinamide lower than oily, non-reactive skin does", () => {
    const n = need("pore_serum");
    const base = { effectiveUv: 3, activities: trip.activities };
    const p = getProduct("ordinary-niacinamide-10")!;
    expect(fitScore(p, n, { ...base, sensitive: true })).toBeLessThan(fitScore(p, n, { ...base, sensitive: false, skinBase: "oily" }));
  });

  it("picks the cleanser kind from the skin", () => {
    const n = need("gentle_cleanser");
    const ctx = { effectiveUv: 3, activities: trip.activities, sensitive: false };
    const acneSkin = { ...DEMO_SKIN.scores, acne: 40 };
    const acne = getProduct("cerave-acne-control-cleanser")!;
    const hydrating = getProduct("cerave-hydrating-cleanser")!;
    expect(fitScore(acne, n, { ...ctx, scores: acneSkin })).toBeGreaterThan(fitScore(hydrating, n, { ...ctx, scores: acneSkin }));
    const drySkin = { ...DEMO_SKIN.scores, acne: 90, oiliness: 80, pore: 85 };
    expect(fitScore(hydrating, n, { ...ctx, scores: drySkin })).toBeGreaterThan(fitScore(acne, n, { ...ctx, scores: drySkin }));
  });

  it("the same brand scores most, then the same group", () => {
    expect(groupOf("Kiehl's")).toBe("L'Oréal Groupe");
    expect(groupOf("the ordinary")).toBe("The Estée Lauder Companies");
    const n = need("pore_serum");
    const p = getProduct("lrp-niacinamide-10")!;
    const ctx = { effectiveUv: 3, activities: trip.activities, sensitive: false };
    const same = fitScore(p, n, { ...ctx, preferredBrands: ["La Roche-Posay"] });
    const group = fitScore(p, n, { ...ctx, preferredBrands: ["Kiehl's"] });
    const none = fitScore(p, n, { ...ctx, preferredBrands: ["Clinique"] });
    expect(same).toBeGreaterThan(group);
    expect(group).toBeGreaterThan(none);
  });

  it("shows the stated percentage in the reason", async () => {
    const { report } = await run("miami-uv");
    const r = productReasons(getProduct("ordinary-niacinamide-10")!, need("pore_serum"), report, miami().climate, trip, 6, { whole: "Oily" });
    expect(r.join(" ")).toMatch(/Niacinamide 10%/);
  });
});
