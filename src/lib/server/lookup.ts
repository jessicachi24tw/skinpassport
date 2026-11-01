import "server-only";
// Find a product's ingredient list from just its name.
//  1) Our verified catalog
//  2) Open Beauty Facts (open data, community-entered)
//  3) A Claude agent with the web search tool: it must quote the ingredient list from a page
//     it actually found, and we reject any source URL that didn't come back from the search.
// The engine (not the AI) then decides what the ingredients mean.

import { CATALOG } from "../shop/catalog";
import type { Product } from "../types";

export interface LookupHit {
  source: "catalog" | "openbeautyfacts" | "web";
  brand: string;
  name: string;
  ingredientsText: string;
  sourceUrl: string;
  /** Claims found on the page (SPF, %, water resistance), verbatim. */
  claims?: string;
  priceUsd?: number;
  catalogId?: string;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9% ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

/** Share of the query words found in the candidate. */
function overlap(query: string, candidate: string) {
  const q = norm(query);
  const c = new Set(norm(candidate));
  return q.length ? q.filter((w) => c.has(w)).length / q.length : 0;
}

export function findInCatalog(query: string): Product | null {
  let best: Product | null = null;
  let score = 0;
  for (const p of CATALOG) {
    const s = overlap(query, `${p.brand} ${p.name}`);
    if (s > score) {
      best = p;
      score = s;
    }
  }
  return score >= 0.75 ? best : null;
}

async function findOnObf(query: string): Promise<LookupHit | null> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "15",
    fields: "code,product_name,brands,ingredients_text_en,ingredients_text",
  });
  const res = await fetch(`https://world.openbeautyfacts.org/cgi/search.pl?${params}`, {
    headers: { "User-Agent": "SkinPassport/0.4 (hackathon demo)" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) return null;
  type Hit = { code: string; product_name?: string; brands?: string; ingredients_text?: string; ingredients_text_en?: string };
  const hits = ((await res.json())?.products ?? []) as Hit[];
  const ranked = hits
    .map((h) => ({ h, text: (h.ingredients_text_en || h.ingredients_text || "").trim(), s: overlap(query, `${h.brands ?? ""} ${h.product_name ?? ""}`) }))
    .filter((x) => x.text.length > 30 && x.text.includes(",") && x.s >= 0.6)
    .sort((a, b) => b.s - a.s);
  const top = ranked[0];
  if (!top) return null;
  return {
    source: "openbeautyfacts",
    brand: (top.h.brands ?? "").split(",")[0].trim(),
    name: (top.h.product_name ?? "").trim(),
    ingredientsText: top.text,
    sourceUrl: `https://world.openbeautyfacts.org/product/${top.h.code}`,
  };
}

const MODEL = process.env.ANTHROPIC_LOOKUP_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

type Block =
  | { type: "text"; text: string }
  | { type: "server_tool_use"; id: string; input: { query: string } }
  | { type: "web_search_tool_result"; content: { type: string; url?: string; title?: string }[] | { type: string; error_code: string } };

/** Claude + web search. Returns null if nothing trustworthy was found. */
async function findOnWeb(query: string): Promise<LookupHit | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const system =
    "You find the published ingredient (INCI) list of a skincare product. Search the web, prefer the brand's official US page, then major retailers (Sephora, Ulta, Dermstore, Target, Walmart) or INCIDecoder/Skinsort. " +
    "Copy the ingredient list exactly as written on the page you found. Never write an ingredient list from memory. " +
    'Answer with only one JSON object: {"found": boolean, "brand": string, "name": string, "url": string, "ingredients": string, "claims": string, "price_usd": number|null}. ' +
    '"claims" = verbatim percentage, SPF and water-resistance claims from the product name or page (empty string if none). If you cannot find a page with the full ingredient list, answer {"found": false}.';
  const messages: { role: "user" | "assistant"; content: unknown }[] = [{ role: "user", content: `Product: ${query.slice(0, 120)}` }];
  const seen = new Set<string>();
  let finalText = "";
  for (let turn = 0; turn < 3; turn++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system,
        messages,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }],
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error(`Web lookup failed (HTTP ${res.status}).`);
    const data = (await res.json()) as { content: Block[]; stop_reason: string };
    for (const b of data.content) {
      if (b.type === "web_search_tool_result" && Array.isArray(b.content)) for (const r of b.content) if (r.url) seen.add(r.url);
      if (b.type === "text") finalText += b.text;
    }
    // A long search turn can pause; send it back to let Claude continue.
    if (data.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: data.content });
  }
  const json = /\{[\s\S]*\}/.exec(finalText)?.[0];
  if (!json) return null;
  let out: { found?: boolean; brand?: string; name?: string; url?: string; ingredients?: string; claims?: string; price_usd?: number | null };
  try {
    out = JSON.parse(json);
  } catch {
    return null;
  }
  if (!out.found || !out.url || !out.ingredients || out.ingredients.split(",").length < 5) return null;
  // Guard against made-up sources: the URL must be one the search actually returned (same host + path).
  const key = (u: string) => {
    try {
      const x = new URL(u);
      return `${x.hostname.replace(/^www\./, "")}${x.pathname.replace(/\/$/, "")}`;
    } catch {
      return u;
    }
  };
  if (![...seen].some((u) => key(u) === key(out.url!))) return null;
  return {
    source: "web",
    brand: String(out.brand ?? "").slice(0, 60),
    name: String(out.name ?? query).slice(0, 140),
    ingredientsText: String(out.ingredients).slice(0, 4000),
    sourceUrl: out.url,
    claims: String(out.claims ?? "").slice(0, 300),
    priceUsd: typeof out.price_usd === "number" && out.price_usd > 0 && out.price_usd < 1000 ? out.price_usd : undefined,
  };
}

export async function lookupProduct(query: string): Promise<{ hit: LookupHit | null; tried: string[] }> {
  const tried: string[] = [];
  const cat = findInCatalog(query);
  if (cat) {
    return {
      hit: { source: "catalog", brand: cat.brand, name: cat.name, ingredientsText: "", sourceUrl: cat.ingredientSource, catalogId: cat.id, priceUsd: cat.estPriceUsd },
      tried: ["SkinPassport catalog"],
    };
  }
  tried.push("SkinPassport catalog");
  try {
    tried.push("Open Beauty Facts");
    const obf = await findOnObf(query);
    if (obf) return { hit: obf, tried };
  } catch {
    /* offline or slow: try the web */
  }
  if (process.env.ANTHROPIC_API_KEY) {
    tried.push("Web search (Claude)");
    const web = await findOnWeb(query);
    if (web) return { hit: web, tried };
  }
  return { hit: null, tried };
}
