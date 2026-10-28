// Action plan built from what the user chose: products in the bag + what they
// already have. "Before the trip" adapts to how many days are left.
// Text uses **bold** for key words (rendered by the UI).

import type { Climate, ConcernReport, NeedId, OwnedProduct, Product, TripInput } from "../types";
import { climateFactors, climateShift, describeShift, LONG_TERM_MIN_DAYS, NEED_TITLES, shiftFactors, sunscreenSpec } from "./necessity";

export interface PlanItem {
  needs: NeedId[];
  name: string; // "La Roche-Posay Anthelios…" or "your sunscreen"
  when?: "am" | "pm" | "both";
  longTerm?: boolean;
  photosensitizing?: boolean;
}

export interface ActionStep {
  when: string; // "Today", "Nov 4 · 3 days before"
  text: string;
}

export interface ActionPlan {
  daysUntil: number;
  before: ActionStep[];
  during: { title: string; steps: string[] }[];
  shopping: { buy: Product[]; fromHome: string[]; totalUsd: number };
}

const fmt = (iso: string, addDays = 0) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + addDays);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const short = (name: string) => name.replace(/ with .*$/i, "");

export function itemsFrom(bag: Product[], owned: OwnedProduct[], ownedNeeds: NeedId[]): PlanItem[] {
  const items: PlanItem[] = [
    ...bag.map((p) => ({
      needs: p.needs,
      name: `${p.brand} ${short(p.name)}`,
      when: p.when,
      longTerm: p.longTerm,
      photosensitizing: p.ingredients.includes("retinoid"),
    })),
    ...owned.map((o) => ({ needs: o.needs, name: `${o.brand ? `${o.brand} ` : ""}${o.name}`.trim(), photosensitizing: o.photosensitizing })),
  ];
  for (const n of ownedNeeds) {
    if (!items.some((i) => i.needs.includes(n))) items.push({ needs: [n], name: `your ${NEED_TITLES[n].toLowerCase()}` });
  }
  return items;
}

export function buildActionPlan(args: {
  trip: TripInput;
  daysUntil: number;
  climate: Climate;
  origin: Climate | null;
  report: ConcernReport[];
  bag: Product[];
  owned: OwnedProduct[];
  ownedNeeds: NeedId[];
}): ActionPlan {
  const { trip, daysUntil: d, climate, origin, report, bag, owned, ownedNeeds } = args;
  const items = itemsFrom(bag, owned, ownedNeeds);
  // Sun-sensitizing products never go into the daytime routine.
  const pick = (n: NeedId) => items.find((i) => i.needs.includes(n) && !i.photosensitizing) ?? items.find((i) => i.needs.includes(n));
  const f = climateFactors(climate, trip.activities);
  const band = (k: ConcernReport["key"]) => report.find((r) => r.key === k)?.band ?? "normal";
  const shift = climateShift(origin, climate);
  const sh = shiftFactors(shift);
  const start = trip.startDate;
  const at = (daysBefore: number) => (daysBefore <= 0 || d - daysBefore <= 0 ? "Today" : `${fmt(start, -daysBefore)} · ${daysBefore} day${daysBefore === 1 ? "" : "s"} before`);
  const before: ActionStep[] = [];

  // Shopping first, so products arrive in time.
  if (bag.length) {
    before.push(
      d >= 6
        ? { when: "Today", text: `Order your **${bag.length} product${bag.length === 1 ? "" : "s"}** by **${fmt(start, -5)}** so they arrive before you leave` }
        : { when: "Today", text: `Only **${d} day${d === 1 ? "" : "s"}** left — **buy in store** rather than waiting for delivery` },
    );
  }

  // Long-term brightening: only with enough time.
  const bright = items.find((i) => i.longTerm);
  if (bright && d >= LONG_TERM_MIN_DAYS) {
    before.push({ when: "Today", text: `Start **${bright.name}** now — brightening needs **about 4 weeks** of daily use` });
  } else if (band("age_spot") !== "strong" && d < LONG_TERM_MIN_DAYS && f.uv >= 40) {
    before.push({ when: "Today", text: `**${d} days** is too short for a brightening serum to work — protect dark spots with **daily sunscreen** instead` });
  }

  // Hydration build-up.
  const serum = pick("hydrating_serum");
  const cream = pick("barrier_cream") ?? pick("gel_moisturizer");
  if (band("moisture") !== "strong") {
    before.push({
      when: "Today",
      text: serum
        ? `Use **${serum.name}** morning and night from today to build up hydration${cream ? `, sealed with **${cream.name}**` : ""}`
        : "Boost hydration morning and night from today: **serum + moisturizer**",
    });
    if (band("moisture") === "weak" && d >= 2) before.push({ when: "Today", text: "Add a **hydrating sheet mask every other night** until you leave" });
  }

  // Patch test new products.
  if (bag.length && d >= 2) before.push({ when: d >= 4 ? at(Math.min(d - 1, 7)) : "Today", text: "**Patch-test new products** on your jaw for 48 hours before relying on them" });
  else if (bag.length) before.push({ when: "Today", text: "Not enough time to patch-test — for the first days, **stick to products you've used before**" });

  // Pause actives before strong sun or a sensitive barrier.
  const photo = items.filter((i) => i.photosensitizing).map((i) => i.name);
  if (photo.length && f.uv >= 40) {
    before.push({ when: at(3), text: `Pause **${photo.join(", ")}** 3 days before — retinoids and acids make skin more sun-sensitive (UV ${f.effectiveUv.toFixed(0)} at your destination)` });
  } else if (band("redness") !== "strong") {
    before.push({ when: at(3), text: "Pause **retinol and exfoliating acids** to calm your barrier before the trip" });
  }

  // Get ahead of a big climate change.
  if (shift && (sh.colder >= 40 || sh.drier >= 40)) {
    before.push({ when: at(2), text: `Your destination is **${describeShift(shift)}** — switch to a **richer night cream** now${cream ? ` (**${cream.name}**)` : ""}` });
  }

  if (trip.transport.includes("plane")) before.push({ when: at(1), text: "Pack liquids in **≤100 ml (3.4 oz)** bottles in a clear bag — decant big sizes" });

  // ---------- During the trip ----------
  const during: ActionPlan["during"] = [];
  const mist = pick("face_mist");
  const lip = pick("lip_care");
  const sun = pick("sunscreen");
  const travelSteps: string[] = [];
  if (trip.transport.includes("plane")) {
    travelSteps.push("Skip makeup on the flight; apply serum + moisturizer before boarding");
    travelSteps.push(mist ? `Mist with **${mist.name}** every 2–3 hours, then pat dry` : "Drink water every hour; cabin air is 10–20% humidity");
  } else if (trip.transport.some((t) => t === "train" || t === "bus" || t === "car")) {
    travelSteps.push(mist ? `Keep **${mist.name}** in your bag for air-conditioned rides` : "Air-con dries skin — moisturize before long rides");
  }
  if (lip) travelSteps.push(`Keep **${lip.name}** in your pocket`);
  if (travelSteps.length) during.push({ title: "Travel day", steps: travelSteps });

  const spec = sunscreenSpec(f.effectiveUv, trip.activities);
  const am: string[] = [];
  const brightAm = items.find((i) => i.longTerm && i.when !== "pm" && d >= LONG_TERM_MIN_DAYS);
  if (brightAm) am.push(`**${brightAm.name}**`);
  if (serum) am.push(`**${serum.name}**`);
  const dayCream = f.hot >= 40 ? (pick("gel_moisturizer") ?? cream) : cream;
  if (dayCream) am.push(`**${dayCream.name}**`);
  am.push(sun ? `**${sun.name}** (${spec.label})` : `**Sunscreen ${spec.label}**`);
  during.push({ title: "Every morning", steps: am.map((s, i) => `${i + 1}. ${s}`) });

  const pm: string[] = [];
  const cleanser = pick("gentle_cleanser");
  pm.push(cleanser ? `**${cleanser.name}**${f.uv >= 60 ? " (twice, to remove water-resistant SPF)" : ""}` : "**Gentle cleanser**");
  if (serum) pm.push(`**${serum.name}**`);
  const night = pick("barrier_cream") ?? pick("soothing") ?? cream;
  if (night) pm.push(`**${night.name}**${f.cold >= 40 ? " — a thicker layer in the cold" : ""}`);
  const after = pick("after_sun");
  if (after) pm.push(`**${after.name}** on sun-exposed skin`);
  during.push({ title: "Every night", steps: pm.map((s, i) => `${i + 1}. ${s}`) });

  const tips: string[] = [];
  const leave = items.filter((i) => i.photosensitizing && !i.needs.length).map((i) => i.name);
  if (leave.length && f.uv >= 40) tips.push(`Leave **${leave.join(", ")}** at home — skin is more sun-sensitive with it`);
  if (f.uv >= 50) tips.push(`Reapply sunscreen **every 2 hours** outdoors (UV up to ${f.effectiveUv.toFixed(0)})`);
  if (trip.activities.includes("pool")) tips.push("Rinse off **chlorine** right after swimming");
  if (f.pollution >= 30) tips.push(`Air quality is poor (AQI ${climate.aqiMax}) — never skip the evening cleanse`);
  if (tips.length) during.push({ title: "Remember", steps: tips });

  // ---------- Shopping list ----------
  const fromHome = items.filter((i) => i.needs.length && !bag.some((b) => i.name === `${b.brand} ${short(b.name)}`)).map((i) => i.name);
  return {
    daysUntil: d,
    before,
    during,
    shopping: { buy: bag, fromHome, totalUsd: Math.round(bag.reduce((t, p) => t + p.estPriceUsd, 0)) },
  };
}
