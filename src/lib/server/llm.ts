import "server-only";
// Optional LLM layer (Anthropic Claude). The rule engine decides WHAT to recommend;
// the LLM only writes a short, friendly coach note that explains it.
// Without ANTHROPIC_API_KEY a template note is used instead.

import { describeShift } from "../engine/necessity";
import type { Climate, ClimateShift, Need, SkinScores, TripContext } from "../types";

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

export function templateCoachNote(skin: SkinScores, climate: Climate, must: Need[], shift: ClimateShift | null): string {
  const items = must.map((n) => n.title.toLowerCase());
  const list = items.length ? items.join(", ") : "your usual routine";
  const skinLine = skin.moisture < 50 ? "Your skin is low on moisture right now" : skin.redness < 50 ? "Your skin is showing some sensitivity" : "Your skin is in good shape";
  const shiftLine = shift ? ` — ${describeShift(shift)}` : "";
  return `${skinLine}, and ${climate.locationName} will bring ${climate.tempMinC}–${climate.tempMaxC}°C, ${climate.humidityPct}% humidity and UV up to ${climate.uvMax}${shiftLine}. Pack ${list} first — those carry the highest necessity scores for this trip.`;
}

export async function coachNote(
  skin: SkinScores,
  climate: Climate,
  trip: TripContext & { notes?: string },
  needs: Need[],
  shift: ClimateShift | null,
): Promise<{ text: string; source: "llm" | "template" }> {
  const must = needs.filter((n) => n.tier === "must");
  const fallback = templateCoachNote(skin, climate, must, shift);
  if (!hasLlm()) return { text: fallback, source: "template" };
  try {
    const text = await ask(
      "You are SkinPassport, a friendly travel skincare coach. Write 2–3 short sentences in English. Explain why the top items matter for this person's skin, the climate change from home and their plans. If the special notes mention something relevant (an outdoor event, a long flight), mention it. Use only the facts given. Do not invent products. No medical advice.",
      JSON.stringify({
        skinScores_higherIsHealthier: skin,
        destination: climate,
        changeFromHome: shift ? describeShift(shift) : null,
        trip: { days: trip.days, activities: trip.activities, transport: trip.transport, specialNotes: (trip.notes ?? "").slice(0, 400) },
        topNeeds: needs.slice(0, 4).map((n) => ({ item: n.title, necessity: n.score, reasons: n.reasons })),
      }),
    );
    return text ? { text, source: "llm" } : { text: fallback, source: "template" };
  } catch {
    return { text: fallback, source: "template" };
  }
}
