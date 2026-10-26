// POST /api/trip/parse  { text, today }  ->  { trip: Partial<TripInput> }
import { parseTrip } from "@/lib/server/llm";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").slice(0, 500);
  if (!text.trim()) return Response.json({ error: "Describe your trip first." }, { status: 400 });
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(body.today)) ? String(body.today) : new Date().toISOString().slice(0, 10);
  return Response.json({ trip: await parseTrip(text, today) });
}
