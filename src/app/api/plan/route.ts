// POST /api/plan  { skin: SkinScores, climate: Climate, origin?: Climate, trip, daysUntilTrip }
// Runs the rule engine, picks products from the shop provider and adds a coach note.
import { buildRoutine, climateFactors, climateShift, computeNeeds, concernLevels } from "@/lib/engine/necessity";
import { buildKits } from "@/lib/engine/kits";
import { getShopProvider } from "@/lib/shop/provider";
import { coachNote } from "@/lib/server/llm";
import type { Activity, Climate, PlanResult, SkinScores, Transport, TripContext } from "@/lib/types";

const isNum = (x: unknown) => typeof x === "number" && Number.isFinite(x);
const ACTIVITIES: Activity[] = ["city", "beach", "pool", "ski", "hiking", "festival", "business", "nightlife"];
const TRANSPORT: Transport[] = ["plane", "train", "car", "bus", "subway", "ship"];
const validClimate = (c: Climate | undefined): c is Climate => !!c && isNum(c.uvMax) && isNum(c.humidityPct) && isNum(c.tempMinC) && isNum(c.tempMaxC);
const pick = <T extends string>(xs: unknown, allowed: T[]) => (Array.isArray(xs) ? xs.filter((x): x is T => allowed.includes(x as T)) : []);

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
    notes: String(body.trip?.notes ?? "").slice(0, 500),
  };

  const needs = computeNeeds(skin, climate, trip, origin);
  const f = climateFactors(climate, trip.activities);
  const kits = await buildKits(needs, getShopProvider(), {
    sensitive: concernLevels(skin).sensitivity >= 40,
    effectiveUv: f.effectiveUv,
    activities: trip.activities,
  });
  const { preTrip, duringTrip } = buildRoutine(skin, climate, trip, Math.max(0, Number(body.daysUntilTrip) || 0), origin);
  const shift = climateShift(origin, climate);
  const note = await coachNote(skin, climate, trip, needs, shift);

  const result: PlanResult = { needs, kits, preTrip, duringTrip, shift, coachNote: note.text, coachSource: note.source };
  return Response.json(result);
}
