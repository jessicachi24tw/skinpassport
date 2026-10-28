// GET /api/products/search?q=cerave  ->  { results: OwnedProduct[] }
// Our catalog first (instant), then Open Beauty Facts (any brand, live).
import { CATALOG } from "@/lib/shop/catalog";
import { fromCatalog, fromText } from "@/lib/shelf";
import type { OwnedProduct } from "@/lib/types";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

async function searchObf(q: string): Promise<OwnedProduct[]> {
  const params = new URLSearchParams({
    search_terms: q,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "12",
    fields: "code,product_name,brands,ingredients_text",
  });
  const res = await fetch(`https://world.openbeautyfacts.org/cgi/search.pl?${params}`, {
    headers: { "User-Agent": "SkinPassport/0.3 (hackathon demo)" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  type Hit = { code: string; product_name?: string; brands?: string; ingredients_text?: string };
  return ((data?.products ?? []) as Hit[])
    .filter((h) => h.product_name)
    .map((h) => fromText(h.product_name!.trim(), (h.brands ?? "").split(",")[0].trim(), h.ingredients_text ?? "", "openbeautyfacts", `obf-${h.code}`));
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return Response.json({ results: [] });
  const words = norm(q).split(/\s+/);
  const local = CATALOG.filter((p) => words.every((w) => norm(`${p.brand} ${p.name}`).includes(w)))
    .slice(0, 6)
    .map(fromCatalog);
  let remote: OwnedProduct[] = [];
  try {
    remote = await searchObf(q);
  } catch {
    remote = []; // offline: catalog matches + manual entry still work
  }
  const seen = new Set(local.map((l) => norm(`${l.brand} ${l.name}`)));
  const results = [...local, ...remote.filter((r) => !seen.has(norm(`${r.brand} ${r.name}`)))].slice(0, 10);
  return Response.json({ results });
}
