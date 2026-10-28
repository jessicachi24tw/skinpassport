// POST /api/plan  { skin: SkinScores, climate, origin?, trip: {activities, transport, days, notes, daysUntil}, owned?: OwnedProduct[] }
// Runs the rule engine, picks products for every budget tier, checks what the user owns,
// and returns the skin report + summary bullets.
import { climateFactors, climateShift, computeNeeds, concernLevels } from "@/lib/engine/necessity";
import { buildRecommendations } from "@/lib/engine/recommend";
import { buildReport } from "@/lib/engine/report";
import { templateSummary } from "@/lib/engine/summary";
import { getShopProvider } from "@/lib/shop/provider";
import { summaryBullets } from "@/lib/server/llm";
import type { Activity, Climate, NeedId, OwnedProduct, PlanResult, SkinScores, Transport, TripContext } from "@/lib/types";

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const ACTIVITIES: Activity[] = ["city", "beach", "pool", "ski", "hiking", "festival", "business", "nightlife"];
const TRANSPORT: Transport[] = ["plane", "train", "car", "bus", "subway", "ship"];
const NEEDS: NeedId[] = ["sunscreen", "barrier_cream", "hydrating_serum", "gel_moisturizer", "soothing", "brightening", "after_sun", "gentle_cleanser", "lip_care", "face_mist"];
const validClimate = (c: Climate | undefined): c is Climate => !!c && isNum(c.uvMax) && isNum(c.humidityPct) && isNum(c.tempMinC) && isNum(c.tempMaxC);
const pick = <T extends string>(xs: unknown, allowed: T[]) => (Array.isArray(xs) ? xs.filter((x): x is T => allowed.includes(x as T)) : []);

/** Accept only well-formed owned products (they come from the browser). */
function cleanOwned(raw: unknown): OwnedProduct[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 30).flatMap((o) => {
    if (!o || typeof o !== "object") return [];
    const p = o as Record<string, unknown>;
    const needs = pick(p.needs, NEEDS);
    const treatment = p.treatment === true || p.photosensitizing === true;
    if ((!needs.length && !treatment) || typeof p.name !== "string") return [];
    return [
      {
        id: String(p.id ?? p.name).slice(0, 80),
        name: p.name.slice(0, 120),
        brand: String(p.brand ?? "").slice(0, 60),
        needs,
        spf: isNum(p.spf) ? p.spf : undefined,
        waterResistant: typeof p.waterResistant === "boolean" ? p.waterResistant : undefined,
        photosensitizing: p.photosensitizing === true,
        treatment: !needs.length && treatment ? true : undefined,
        source: p.source === "catalog" || p.source === "openbeautyfacts" ? p.source : "manual",
        catalogId: typeof p.catalogId === "string" ? p.catalogId : undefined,
      } satisfies OwnedProduct,
    ];
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const skin = body.skin as SkinScores;
  const climate = body.climate as Climate | undefined;
  const origin = validClimate(body.origin) ? (body.origin as Climate) : null;
  if (!skin || !["moisture", "oiliness", "redness", "age_spot"].every((k) => isNum(skin[k as keyof SkinScores]))) {
    return Response.json({ error: "Missing skin scores." }, { status: 400 });
  }
  if (!validClimate(climate)) return Response.json({ error: "Missing climate data." }, { status: 400 });

  const activities = pick(body.trip?.activities, ACTIVITIES);
  const trip: TripContext & { notes: string } = {
    activities: activities.length ? activities : ["city"],
    transport: pick(body.trip?.transport, TRANSPORT),
    days: Math.min(14, Math.max(1, Number(body.trip?.days) || 3)),
    daysUntil: isNum(body.trip?.daysUntil) ? Math.max(0, body.trip.daysUntil) : undefined,
    notes: String(body.trip?.notes ?? "").slice(0, 500),
  };
  const owned = cleanOwned(body.owned);

  const needs = computeNeeds(skin, climate, trip, origin);
  const f = climateFactors(climate, trip.activities);
  const ctx = {
    sensitive: concernLevels(skin).sensitivity >= 40,
    effectiveUv: f.effectiveUv,
    activities: trip.activities,
    preferredBrands: Array.from(new Set(owned.map((o) => o.brand).filter(Boolean))),
  };
  const items = await buildRecommendations(needs, getShopProvider(), ctx, owned);
  const report = buildReport(skin, climate, trip, origin);
  const shift = climateShift(origin, climate);

  const warnings: string[] = [];
  const photo = owned.filter((o) => o.photosensitizing);
  if (photo.length && f.uv >= 40) {
    warnings.push(`${photo.map((o) => o.name).join(", ")} can make skin more sun-sensitive — pause it a few days before a trip with UV ${f.effectiveUv.toFixed(0)}.`);
  }
  for (const r of items) for (const o of r.owned) if (!o.meetsSpec && o.note) warnings.push(`${o.product.name}: ${o.note}.`);

  const summary = await summaryBullets({ report, climate, shift, trip, needs }, templateSummary(report, climate, shift, needs, items));
  const result: PlanResult = { needs, items, shift, report, summary: summary.bullets, summarySource: summary.source, warnings };
  return Response.json(result);
}
