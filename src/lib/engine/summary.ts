// Template summary: 3–5 short bullets with **bold** key facts.
import type { Climate, ClimateShift, ConcernReport, Need, Recommendation } from "../types";
import { describeShift } from "./necessity";

const BAND = { weak: "Weak", normal: "Normal", strong: "Strong" } as const;
const RISK = { high: "High", medium: "Medium", low: "Low" } as const;

export function templateSummary(report: ConcernReport[], climate: Climate, shift: ClimateShift | null, needs: Need[], items: Recommendation[]): string[] {
  const out: string[] = [];
  const weak = report.filter((r) => r.band !== "strong").sort((a, b) => a.score - b.score);
  out.push(
    weak.length
      ? `**Skin today:** ${weak
          .slice(0, 3)
          .map((r) => `${r.label.split(" (")[0].toLowerCase()} **${BAND[r.band]} (${r.score})**`)
          .join(", ")}`
      : "**Skin today:** every score is in the **Strong** range",
  );
  const where = climate.locationName.split(" (")[0];
  out.push(
    `**${where}:** ${Math.round(climate.tempMinC)}–${Math.round(climate.tempMaxC)}°C, **${climate.humidityPct}% humidity**, **UV ${climate.uvMax}**${climate.basis === "typical" ? " (typical for these dates)" : ""}`,
  );
  if (shift) out.push(`**Change from home:** ${describeShift(shift).replace(/^(.)/, (m) => m)}`);
  const risky = [...report].sort((a, b) => ["low", "medium", "high"].indexOf(b.risk) - ["low", "medium", "high"].indexOf(a.risk))[0];
  if (risky && risky.risk !== "low") out.push(`**Biggest trip risk:** ${risky.label.split(" (")[0].toLowerCase()} — **${RISK[risky.risk]}** (${risky.riskReason.toLowerCase()})`);
  const must = needs.filter((n) => n.tier === "must").map((n) => `**${n.title}**`);
  if (must.length) out.push(`**Pack first:** ${must.join(", ")}`);
  const covered = items.filter((i) => i.owned.some((o) => o.meetsSpec)).map((i) => i.need.title.toLowerCase());
  if (covered.length) out.push(`**Already on your shelf:** ${covered.join(", ")}`);
  return out;
}
