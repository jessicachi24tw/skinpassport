// GET /api/health  ->  which integrations are live vs. mocked (never returns keys)
import { connection } from "next/server";
import { isMockSkin } from "@/lib/server/youcam";
import { hasLlm } from "@/lib/server/llm";

export async function GET() {
  await connection();
  return Response.json({
    youcam: isMockSkin() ? "mock" : "live",
    weather: process.env.OPENWEATHER_API_KEY ? "openweather" : "open-meteo",
    llm: hasLlm() ? "claude" : "template",
    shop: "local-catalog",
  });
}
