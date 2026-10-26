import { describe, expect, it } from "vitest";
import { climateFactors, climateShift, computeNeeds, describeShift, sunscreenSpec, tierFor } from "../necessity";
import { buildKits } from "../kits";
import { catalogProvider } from "../../shop/provider";
import { DEMO_ORIGIN_CLIMATE, DEMO_SKIN, getScenario } from "../scenarios";
import type { Transport } from "../../types";

const run = async (id: string, transport: Transport[] = ["plane"]) => {
  const s = getScenario(id)!;
  const trip = { activities: s.activities, transport, days: s.days };
  const needs = computeNeeds(DEMO_SKIN.scores, s.climate, trip, DEMO_ORIGIN_CLIMATE);
  const f = climateFactors(s.climate, s.activities);
  const kits = await buildKits(needs, catalogProvider, { sensitive: true, effectiveUv: f.effectiveUv, activities: s.activities });
  const byId = Object.fromEntries(needs.map((n) => [n.id, n]));
  const essential = kits[0].items.map((r) => r.need.id);
  const sunscreen = kits[1].items.find((r) => r.need.id === "sunscreen")?.product;
  return { byId, essential, sunscreen, kits };
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

  it("New York winter: barrier cream and hydration are must-pack, SPF 30 is enough", async () => {
    const r = await run("nyc-winter");
    expect(r.essential).toContain("barrier_cream");
    expect(r.essential).toContain("hydrating_serum");
    expect(r.essential).not.toContain("sunscreen");
    expect(r.sunscreen?.spf).toBe(30);
    expect(r.byId.gel_moisturizer.tier).toBe("skip");
  });

  it("Miami: sunscreen SPF 50+ water-resistant, gel instead of rich cream", async () => {
    const r = await run("miami-uv");
    expect(r.essential[0]).toBe("sunscreen");
    expect(r.sunscreen?.spf).toBeGreaterThanOrEqual(50);
    expect(r.sunscreen?.waterResistant).toBe(true);
    expect(r.essential).toContain("gel_moisturizer");
    expect(r.byId.barrier_cream.tier).toBe("skip");
  });

  it("ski trip boosts UV through snow reflection", async () => {
    const r = await run("hokkaido-ski");
    expect(r.essential).toContain("sunscreen");
    expect(r.essential).toContain("lip_care");
  });

  it("compares the destination with home", () => {
    const shift = climateShift(DEMO_ORIGIN_CLIMATE, getScenario("nyc-winter")!.climate)!;
    expect(shift.tempDeltaC).toBeLessThan(-20);
    expect(describeShift(shift)).toMatch(/colder.*drier than Taipei/);
  });

  it("a flight raises the face mist score more than a train", async () => {
    const plane = await run("nyc-winter", ["plane"]);
    const train = await run("nyc-winter", ["train"]);
    expect(plane.byId.face_mist.score).toBeGreaterThan(train.byId.face_mist.score);
  });

  it("multi-select activities combine (ski + pool)", () => {
    const s = getScenario("hokkaido-ski")!;
    const needs = computeNeeds(DEMO_SKIN.scores, s.climate, { activities: ["ski", "pool"], transport: [], days: 4 });
    expect(needs.find((n) => n.id === "gentle_cleanser")!.reasons.join(" ")).toMatch(/chlorine/);
  });

  it("never lists the same product twice in a kit", async () => {
    for (const id of ["nyc-winter", "miami-uv", "hokkaido-ski"]) {
      const { kits } = await run(id);
      const ids = kits[1].items.map((i) => i.product?.id).filter(Boolean);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
