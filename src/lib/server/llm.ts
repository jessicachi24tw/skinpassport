import "server-only";
// Optional LLM layer (Anthropic Claude). The rule engine decides WHAT to recommend;
// the LLM only (a) parses free-text trip descriptions and (b) writes a friendly coach note.
// Without ANTHROPIC_API_KEY everything still works with template fallbacks.

import type { Activity, Climate, Need, SkinScores, TripInput } from "../types";

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

const ACTIVITIES: Activity[] = ["city", "beach", "ski", "outdoor", "business"];

/** Keyword fallback for "Ski trip to Hokkaido next week for 4 days". */
export function parseTripHeuristic(text: string, today = new Date()): Partial<TripInput> {
  const t = text.toLowerCase();
  const out: Partial<TripInput> = {};
  const days = /(\d+)\s*(?:-|\s)?(?:day|days|night|nights|天|晚)/.exec(t);
  if (days) out.days = Math.min(14, Math.max(1, Number(days[1])));
  if (/ski|snow|滑雪/.test(t)) out.activity = "ski";
  else if (/beach|surf|swim|island|海邊|海灘/.test(t)) out.activity = "beach";
  else if (/festival|hike|hiking|camp|outdoor|音樂節|戶外|登山/.test(t)) out.activity = "outdoor";
  else if (/business|conference|meeting|work|出差|會議/.test(t)) out.activity = "business";
  const addDays = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  if (/tomorrow|明天/.test(t)) out.startDate = addDays(1);
  else if (/next week|下週|下周/.test(t)) out.startDate = addDays(7);
  const CJK: Record<string, string> = { 北海道: "Sapporo, Japan", 東京: "Tokyo, Japan", 大阪: "Osaka, Japan", 京都: "Kyoto, Japan", 首爾: "Seoul, South Korea", 台北: "Taipei, Taiwan", 紐約: "New York, USA", 邁阿密: "Miami, USA", 曼谷: "Bangkok, Thailand", 峇里島: "Bali, Indonesia", 巴黎: "Paris, France", 倫敦: "London, UK" };
  for (const [k, v] of Object.entries(CJK)) if (text.includes(k)) out.destination = v;
  const dest = /(?:to|in|at)\s+([A-Z][\w'’.-]*(?:[ ,]+[A-Z][\w'’.-]*)*)/.exec(text);
  if (dest) out.destination = dest[1].replace(/\s+(next|for|this)$/i, "").trim();
  return out;
}

export async function parseTrip(text: string, today: string): Promise<Partial<TripInput>> {
  const fallback = parseTripHeuristic(text, new Date(`${today}T12:00:00`));
  if (!hasLlm()) return fallback;
  try {
    const raw = await ask(
      `You extract travel plans. Today is ${today}. Reply with ONLY a JSON object with keys: destination (English city + country), startDate (YYYY-MM-DD), days (integer 1-14), activity (one of ${ACTIVITIES.join(", ")}), flight (boolean). Use null for unknown values. The input may be in any language.`,
      text,
      200,
    );
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const out: Partial<TripInput> = { ...fallback };
    if (typeof json.destination === "string") out.destination = json.destination;
    if (typeof json.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(json.startDate)) out.startDate = json.startDate;
    if (Number.isInteger(json.days)) out.days = Math.min(14, Math.max(1, json.days));
    if (ACTIVITIES.includes(json.activity)) out.activity = json.activity;
    if (typeof json.flight === "boolean") out.flight = json.flight;
    return out;
  } catch {
    return fallback;
  }
}

export function templateCoachNote(skin: SkinScores, climate: Climate, must: Need[]): string {
  const items = must.map((n) => n.title.toLowerCase());
  const list = items.length ? items.join(", ") : "your usual routine";
  const skinLine = skin.moisture < 50 ? "Your skin is low on moisture right now" : skin.redness < 50 ? "Your skin is showing some sensitivity" : "Your skin is in good shape";
  return `${skinLine}, and ${climate.locationName} will bring ${climate.tempMinC}–${climate.tempMaxC}°C, ${climate.humidityPct}% humidity and UV up to ${climate.uvMax}. Pack ${list} first — those carry the highest necessity scores for this trip.`;
}

export async function coachNote(skin: SkinScores, climate: Climate, trip: TripInput, needs: Need[]): Promise<{ text: string; source: "llm" | "template" }> {
  const must = needs.filter((n) => n.tier === "must");
  const fallback = templateCoachNote(skin, climate, must);
  if (!hasLlm()) return { text: fallback, source: "template" };
  try {
    const text = await ask(
      "You are SkinPassport, a friendly travel skincare coach. Write 2–3 short sentences in English. Explain why the top items matter for this person's skin and destination. Use only the facts given. Do not invent products, do not give medical advice.",
      JSON.stringify({
        skinScores_higherIsHealthier: skin,
        destination: climate,
        trip: { days: trip.days, activity: trip.activity, flight: trip.flight },
        topNeeds: needs.slice(0, 4).map((n) => ({ item: n.title, necessity: n.score, reasons: n.reasons })),
      }),
    );
    return text ? { text, source: "llm" } : { text: fallback, source: "template" };
  } catch {
    return { text: fallback, source: "template" };
  }
}
