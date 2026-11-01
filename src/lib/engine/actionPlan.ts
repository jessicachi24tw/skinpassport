// Action plan built from what the user chose: products in the bag + what they
// already have. "Before the trip" adapts to how many days are left.
// "During the trip" is structured (icon + short text + product) so the UI can show it visually.
// Text uses **bold** for key words (rendered by the UI).

import type { Climate, ConcernReport, NeedId, OwnedProduct, Product, TripInput, SkinType } from "../types";
import { traitsOf, zoneTip } from "./skinType";
import { climateFactors, climateShift, describeShift, LONG_TERM_MIN_DAYS, NEED_TITLES, shiftFactors, sunscreenSpec } from "./necessity";

export interface PlanItem {
  needs: NeedId[];
  name: string; // "La Roche-Posay Anthelios…" or "your sunscreen"
  when?: "am" | "pm" | "both";
  longTerm?: boolean;
  photosensitizing?: boolean;
  /** Catalog id, so the UI can show the product photo. */
  productId?: string;
}

export interface ActionStep {
  when: string; // "Today", "Nov 4 · 3 days before"
  text: string;
}

export interface DuringStep {
  icon: string;
  /** Short label, e.g. "Sunscreen · SPF 50+". */
  text: string;
  item?: PlanItem;
}

export interface DuringGroup {
  id: "travel" | "am" | "pm" | "tips";
  title: string;
  icon: string;
  steps: DuringStep[];
}

export interface ActionPlan {
  daysUntil: number;
  before: ActionStep[];
  during: DuringGroup[];
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
      photosensitizing: p.ingredients.includes("retinoid") || p.ingredients.includes("glycolic_acid"),
      productId: p.id,
    })),
    ...owned.map((o) => ({ needs: o.needs, name: `${o.brand ? `${o.brand} ` : ""}${o.name}`.trim(), photosensitizing: o.photosensitizing, productId: o.catalogId })),
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
  skinType?: SkinType | null;
}): ActionPlan {
  const { trip, daysUntil: d, climate, origin, report, bag, owned, ownedNeeds } = args;
  const st = traitsOf(args.skinType);
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
        : { when: "Today", text: `Only **${d} day${d === 1 ? "" : "s"}** left, so **buy in store** rather than waiting for delivery` },
    );
  }

  // Long-term brightening: only with enough time.
  const bright = items.find((i) => i.longTerm);
  if (bright && d >= LONG_TERM_MIN_DAYS) {
    before.push({ when: "Today", text: `Start **${bright.name}** now. Brightening needs **about 4 weeks** of daily use` });
  } else if (band("age_spot") !== "strong" && d < LONG_TERM_MIN_DAYS && f.uv >= 40) {
    before.push({ when: "Today", text: `**${d} days** is too short for a brightening serum to work. Protect dark spots with **daily sunscreen** instead` });
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
  else if (bag.length) before.push({ when: "Today", text: "Not enough time to patch-test. For the first days, **stick to products you've used before**" });

  // Pause actives before strong sun or a sensitive barrier.
  const photo = items.filter((i) => i.photosensitizing).map((i) => i.name);
  if (photo.length && f.uv >= 40) {
    before.push({ when: at(3), text: `Pause **${photo.join(", ")}** 3 days before. Retinoids and acids make skin more sun-sensitive (UV ${f.effectiveUv.toFixed(0)} at your destination)` });
  } else if (band("redness") !== "strong") {
    before.push({ when: at(3), text: "Pause **retinol and exfoliating acids** to calm your barrier before the trip" });
  }

  // Get ahead of a big climate change.
  if (shift && (sh.colder >= 40 || sh.drier >= 40)) {
    before.push({ when: at(2), text: `Your destination is **${describeShift(shift)}**. Switch to a **richer night cream** now${cream ? ` (**${cream.name}**)` : ""}` });
  }

  if (trip.transport.includes("plane")) before.push({ when: at(1), text: "Pack liquids in **≤100 ml (3.4 oz)** bottles in a clear bag. Decant big sizes" });

  // ---------- During the trip ----------
  const during: DuringGroup[] = [];
  const mist = pick("face_mist");
  const lip = pick("lip_care");
  const sun = pick("sunscreen");
  const step = (icon: string, text: string, item?: PlanItem): DuringStep => ({ icon, text, item });

  const travel: DuringStep[] = [];
  if (trip.transport.includes("plane")) {
    travel.push(step("🚫", "No makeup on the flight"));
    travel.push(serum ? step("💧", "Serum before boarding", serum) : step("💧", "Moisturize before boarding", cream));
    travel.push(mist ? step("💨", "Mist every **2 to 3 h**", mist) : step("🚰", "Water every hour"));
  } else if (trip.transport.some((t) => t === "train" || t === "bus" || t === "car")) {
    travel.push(mist ? step("💨", "Mist on long rides", mist) : step("💧", "Moisturize before long rides", cream));
  }
  if (lip) travel.push(step("👄", "Lip balm in your pocket", lip));
  if (travel.length) during.push({ id: "travel", title: "Travel day", icon: trip.transport.includes("plane") ? "✈️" : "🚆", steps: travel });

  const spec = sunscreenSpec(f.effectiveUv, trip.activities);
  const am: DuringStep[] = [];
  const brightAm = items.find((i) => i.longTerm && i.when !== "pm" && d >= LONG_TERM_MIN_DAYS);
  if (brightAm) am.push(step("✨", "Brightening serum", brightAm));
  const toner = pick("toner");
  if (toner) am.push(step("🫗", "Toner", toner));
  if (serum) am.push(step("💧", "Hydrating serum", serum));
  // Targeted care: each product appears once; acids and retinoids only at night.
  const placed = new Set<PlanItem>();
  const take = (n: NeedId, dayOk: boolean) => {
    const it = items.find((i) => i.needs.includes(n) && !placed.has(i) && (!dayOk || (!i.photosensitizing && i.when !== "pm")));
    if (it) placed.add(it);
    return it;
  };
  const poreAm = take("pore_serum", true);
  if (poreAm) am.push(step("🔍", "Pore serum", poreAm));
  const linesAm = take("line_smoothing", true);
  if (linesAm) am.push(step("〰️", "Line-smoothing serum", linesAm));
  // Oily and combination skin get the light gel by day when there is one.
  const dayCream = f.hot >= 40 || st.base === "oily" || st.base === "combination" ? (pick("gel_moisturizer") ?? cream) : cream;
  if (dayCream) am.push(step("🧴", f.hot >= 40 ? "Light moisturizer" : "Moisturizer", dayCream));
  am.push(step("☀️", `Sunscreen **${spec.label}**${f.uv >= 50 ? " · reapply every **2 h**" : ""}`, sun));
  during.push({ id: "am", title: "Every morning", icon: "🌅", steps: am });

  const pm: DuringStep[] = [];
  const cleanser = pick("gentle_cleanser");
  pm.push(step("🫧", f.uv >= 60 ? "Cleanse **twice**" : "Gentle cleanse", cleanser));
  if (toner) pm.push(step("🫗", "Toner", toner));
  const exfoliant = take("exfoliant", false);
  if (exfoliant) pm.push(step("✨", f.uv >= 50 ? "Exfoliant, **2 nights a week**" : "Exfoliant, **2 to 3 nights a week**", exfoliant));
  const blemish = take("blemish_care", false);
  if (blemish) pm.push(step("🎯", "Dab on **spots only**", blemish));
  const porePm = take("pore_serum", false);
  if (porePm) pm.push(step("🔍", "Pore serum", porePm));
  const linesPm = take("line_smoothing", false);
  if (linesPm) pm.push(step("〰️", linesPm.photosensitizing ? "Retinol, **night only**" : "Line-smoothing serum", linesPm));
  if (serum) pm.push(step("💧", "Hydrating serum", serum));
  const night = pick("barrier_cream") ?? pick("soothing") ?? cream;
  if (night) pm.push(step("🌙", f.cold >= 40 ? "Rich cream, **thick layer**" : "Night cream", night));
  const after = pick("after_sun");
  if (after) pm.push(step("🧊", "After-sun on exposed skin", after));
  during.push({ id: "pm", title: "Every night", icon: "🌙", steps: pm });

  const tips: DuringStep[] = [];
  const leave = items.filter((i) => i.photosensitizing && !i.needs.length).map((i) => i.name);
  if (leave.length && f.uv >= 40) tips.push(step("🏠", `Leave **${leave.join(", ")}** at home`));
  const zone = zoneTip(args.skinType);
  if (zone) tips.push(step("🧩", zone));
  if (st.redness) tips.push(step("🌿", "Redness-prone: **no new actives** on the trip"));
  if (trip.activities.includes("pool")) tips.push(step("🏊", "Rinse off **chlorine** after swimming"));
  if (trip.activities.includes("ski")) tips.push(step("🎿", "Snow reflects UV: **reapply on the slopes**"));
  if (f.pollution >= 30) tips.push(step("😷", `AQI ${climate.aqiMax}: **never skip** the evening cleanse`));
  if (f.dryAir >= 50) tips.push(step("🚰", "Drink water, **humidity is low**"));
  if (tips.length) during.push({ id: "tips", title: "Remember", icon: "📌", steps: tips });

  return { daysUntil: d, before, during };
}
