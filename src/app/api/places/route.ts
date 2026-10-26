// GET /api/places?q=new&country=US  ->  { places: Place[] }
// Instant local matches first, then live Open-Meteo geocoding results (deduplicated).
import { searchLocalCities } from "@/lib/places";
import { searchPlaces } from "@/lib/server/weather";
import type { Place } from "@/lib/types";

const key = (p: Place) => `${p.name}|${p.admin1 ?? ""}|${p.countryCode}`.toLowerCase();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  const country = (url.searchParams.get("country") ?? "").toUpperCase().slice(0, 2) || undefined;
  if (q.length < 1) return Response.json({ places: [] });

  const local = searchLocalCities(q, country).slice(0, 6);
  let remote: Place[] = [];
  if (q.length >= 2) {
    try {
      remote = await searchPlaces(q, country);
    } catch {
      remote = []; // offline or rate-limited: local matches still work
    }
  }
  const seen = new Set<string>();
  const places = [...local, ...remote].filter((p) => {
    const k = key(p);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return Response.json({ places: places.slice(0, 8) });
}
