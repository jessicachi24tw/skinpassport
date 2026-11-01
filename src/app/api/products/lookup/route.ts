// POST /api/products/lookup  { query: "La Roche-Posay Effaclar serum" }
// -> { hit: { source, brand, name, ingredientsText, sourceUrl, claims?, priceUsd?, catalogId? } | null, tried: string[] }
import { lookupProduct } from "@/lib/server/lookup";

// Vercel: allow slow upstream calls (YouCam upload, Claude web search).
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const query = String(body.query ?? "").trim().slice(0, 120);
  if (query.length < 3) return Response.json({ error: "Type a product name." }, { status: 400 });
  try {
    return Response.json(await lookupProduct(query));
  } catch (e) {
    console.error("products/lookup", (e as Error).message);
    return Response.json({ error: "Couldn't look that up right now. Try again, or paste the ingredient list." }, { status: 502 });
  }
}
