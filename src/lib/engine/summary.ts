// Template summary: short bullets with **bold** key facts.
// The packing bullets ("Pack first", "Already on your shelf") are computed live in the
// browser from what the user puts in the bag or marks as owned: see packingBullets().
import type { Climate, ClimateShift, ConcernReport, Need, NeedId, Product, Recommendation, SkinType } from "../types";
import { describeShift } from "./necessity";
import { describeSkinType } from "./skinType";

const BAND = { weak: "Weak", normal: "Normal", strong: "Strong" } as const;
const RISK = { high: "High", medium: "Medium", low: "Low" } as const;

export function templateSummary(report: ConcernReport[], climate: Climate, shift: ClimateShift | null, skinType: SkinType | null = null): string[] {
  const out: string[] = [];
  const type = describeSkinType(skinType);
  if (type) out.push(`**Skin type:** ${type}`);
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
  if (risky && risky.risk !== "low") out.push(`**Biggest trip risk:** ${risky.label.split(" (")[0].toLowerCase()} is **${RISK[risky.risk]}** (${risky.riskReason.toLowerCase()})`);
  return out;
}

/** Live packing bullets: what is still missing, what is in the bag, what comes from home. */
export function packingBullets(needs: Need[], items: Recommendation[], bag: Product[], ownedNeeds: NeedId[]): string[] {
  const fromShelf = new Set(items.filter((i) => i.owned.some((o) => o.meetsSpec)).map((i) => i.need.id));
  const home = new Set<NeedId>([...fromShelf, ...ownedNeeds]);
  const inBag = (id: NeedId) => bag.some((p) => p.needs.includes(id));
  const must = needs.filter((n) => n.tier === "must");
  const missing = must.filter((n) => !home.has(n.id) && !inBag(n.id));
  const out: string[] = [];
  if (must.length) {
    out.push(
      missing.length
        ? `**Pack first:** ${missing.map((n) => `**${n.title}**`).join(", ")}`
        : `**Pack first:** all ${must.length} must-pack${must.length === 1 ? "" : "s"} covered ✓`,
    );
  }
  if (bag.length) out.push(`**In your bag:** ${bag.map((p) => `${p.brand} ${p.name.replace(/ with .*$/i, "")}`).join(", ")}`);
  const shelf = needs.filter((n) => home.has(n.id)).map((n) => n.title.toLowerCase());
  if (shelf.length) out.push(`**Already on your shelf:** ${shelf.join(", ")}`);
  return out;
}
