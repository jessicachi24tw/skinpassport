// POST /api/weather
//   { scenarioId }                         -> demo destination climate
//   { place: {name,lat,lon}, startDate, days } -> forecast for the trip window
//   { place, now: true }                   -> current climate at home (origin)
import { getScenario } from "@/lib/engine/scenarios";
import { getCurrentClimate, getTripClimate } from "@/lib/server/weather";

const isCoord = (n: unknown, max: number) => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= max;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.scenarioId) {
    const s = getScenario(String(body.scenarioId));
    if (!s) return Response.json({ error: "Unknown scenario" }, { status: 400 });
    return Response.json({ climate: s.climate });
  }
  const p = body.place;
  if (!p || !isCoord(p.lat, 90) || !isCoord(p.lon, 180)) return Response.json({ error: "Pick a city from the list." }, { status: 400 });
  const place = { name: String(p.name ?? "Destination").slice(0, 80), lat: p.lat, lon: p.lon };
  try {
    if (body.now) return Response.json({ climate: await getCurrentClimate(place) });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.startDate))) return Response.json({ error: "Pick a start date." }, { status: 400 });
    const days = Math.min(14, Math.max(1, Number(body.days) || 3));
    return Response.json({ climate: await getTripClimate(place, String(body.startDate), days) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
