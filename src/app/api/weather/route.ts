// POST /api/weather  { scenarioId }  or  { destination, startDate, days }  ->  { climate }
import { getScenario } from "@/lib/engine/scenarios";
import { getTripClimate } from "@/lib/server/weather";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.scenarioId) {
    const s = getScenario(String(body.scenarioId));
    if (!s) return Response.json({ error: "Unknown scenario" }, { status: 400 });
    return Response.json({ climate: s.climate });
  }
  const { destination, startDate, days } = body;
  if (!destination || !/^\d{4}-\d{2}-\d{2}$/.test(String(startDate))) {
    return Response.json({ error: "Destination and start date are required." }, { status: 400 });
  }
  try {
    const climate = await getTripClimate(String(destination), String(startDate), Math.min(14, Math.max(1, Number(days) || 3)));
    return Response.json({ climate });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
