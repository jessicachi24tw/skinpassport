import "server-only";
// Optional LLM layer (Anthropic Claude). The rule engine decides WHAT to recommend;
// the LLM only rewrites the summary bullets in a friendlier voice.
// Without ANTHROPIC_API_KEY the template bullets are used instead.

import { describeShift } from "../engine/necessity";
import { describeSkinType } from "../engine/skinType";
import type { Climate, ClimateShift, ConcernReport, Need, SkinType, TripContext } from "../types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

export const hasLlm = () => Boolean(process.env.ANTHROPIC_API_KEY);

async function ask(system: string, user: string, maxTokens = 400): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY as string,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`LLM error (HTTP ${res.status})`);
  const data = await res.json();
  return (data?.content ?? []).map((c: { text?: string }) => c.text ?? "").join("").trim();
}

/** Claude rewrites the summary as 2 to 4 bullets with **bold** key facts; falls back to the template. */
export async function summaryBullets(
  facts: { report: ConcernReport[]; climate: Climate; shift: ClimateShift | null; trip: TripContext & { notes?: string }; needs: Need[]; skinType?: SkinType | null },
  fallback: string[],
): Promise<{ bullets: string[]; source: "llm" | "template" }> {
  if (!hasLlm()) return { bullets: fallback, source: "template" };
  try {
    const text = await ask(
      "You are SkinPassport, a travel skincare coach. Write 2 to 5 bullets in English, each one line, each starting with '- '. Wrap the key fact of each bullet in **double asterisks** (scores, bands, weather numbers, product categories). Cover: skin type (if given) and skin today, destination climate (and change from home), the biggest risk, and one tip from the user's notes if relevant. Do not list products to pack. Use only the facts given. No product brand names, no medical claims. Never use em dashes.",
      JSON.stringify({
        skinType: describeSkinType(facts.skinType),
        skin: facts.report.map((r) => ({ concern: r.label, score: r.score, band: r.band, tripRisk: r.risk, why: r.riskReason })),
        destination: facts.climate,
        changeFromHome: facts.shift ? describeShift(facts.shift) : null,
        trip: { days: facts.trip.days, activities: facts.trip.activities, transport: facts.trip.transport, daysUntilDeparture: facts.trip.daysUntil, notes: (facts.trip.notes ?? "").slice(0, 400) },
        priorities: facts.needs.filter((n) => n.tier !== "skip").slice(0, 5).map((n) => ({ item: n.title, necessity: n.score, tag: n.tier })),
      }),
      400,
    );
    const bullets = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("- "))
      .map((l) => l.slice(2).trim())
      .slice(0, 5)
      .map((l) => l.replace(/\s*—\s*/g, ": "));
    return bullets.length >= 2 ? { bullets, source: "llm" } : { bullets: fallback, source: "template" };
  } catch {
    return { bullets: fallback, source: "template" };
  }
}
