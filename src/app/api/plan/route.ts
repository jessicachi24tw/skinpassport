// POST /api/plan  { skin: SkinScores, climate: Climate, trip: TripInput, daysUntilTrip }
// Runs the rule engine, picks products from the shop provider and adds a coach note.
import { buildRoutine, climateFactors, computeNeeds, concernLevels } from "@/lib/engine/necessity";
import { buildKits } from "@/lib/engine/kits";
import { getShopProvider } from "@/lib/shop/provider";
import { coachNote } from "@/lib/server/llm";
import type { Climate, PlanResult, SkinScores, TripInput } from "@/lib/types";

const isNum = (x: unknown) => typeof x === "number" && Number.isFinite(x);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const skin = body.skin as SkinScores;
  const climate = body.climate as Climate;
  const trip = body.trip as TripInput;
  if (!skin || !["moisture", "oiliness", "redness", "age_spot"].every((k) => isNum(skin[k as keyof SkinScores]))) {
    return Response.json({ error: "Missing skin scores." }, { status: 400 });
  }
  if (!climate || !isNum(climate.uvMax) || !isNum(climate.humidityPct)) {
    return Response.json({ error: "Missing climate data." }, { status: 400 });
  }
  const t: TripInput = {
    destination: String(trip?.destination ?? climate.locationName),
    startDate: String(trip?.startDate ?? ""),
    days: Math.min(14, Math.max(1, Number(trip?.days) || 3)),
    activity: trip?.activity ?? "city",
    flight: trip?.flight ?? true,
  };

  const needs = computeNeeds(skin, climate, t);
  const f = climateFactors(climate, t.activity);
  const kits = await buildKits(needs, getShopProvider(), {
    sensitive: concernLevels(skin).sensitivity >= 40,
    effectiveUv: f.effectiveUv,
    activity: t.activity,
  });
  const { preTrip, duringTrip } = buildRoutine(skin, climate, t, Math.max(0, Number(body.daysUntilTrip) || 0));
  const note = await coachNote(skin, climate, t, needs);

  const result: PlanResult = { needs, kits, preTrip, duringTrip, coachNote: note.text, coachSource: note.source };
  return Response.json(result);
}
