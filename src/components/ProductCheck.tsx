"use client";
// "Check a product" inside a saved passport: type a name, we find its ingredient list
// (our catalog → Open Beauty Facts → Claude web search), then score it against this trip.

import { useState } from "react";
import { concLabel, strengthOf } from "@/lib/engine/concentration";
import { NEED_TITLES } from "@/lib/engine/necessity";
import { checkProduct, productFromFound, type CheckResult, type FoundProduct } from "@/lib/engine/productCheck";
import { getPassport, putPassport, type Passport, type SavedCheck } from "@/lib/passports";
import { getProduct } from "@/lib/shop/catalog";
import { setApp, useApp } from "@/lib/store";
import type { NeedId, Product } from "@/lib/types";
import ProductShot from "./ProductShot";
import { Rich } from "./ui";

const SOURCE_LABEL: Record<FoundProduct["source"], string> = {
  catalog: "SkinPassport catalog (verified)",
  openbeautyfacts: "Open Beauty Facts",
  web: "Web search",
  pasted: "the list you pasted",
};

const VERDICT_STYLE: Record<CheckResult["verdict"], { chip: string; label: string; icon: string }> = {
  swap_in: { chip: "bg-leaf-soft text-leaf", label: "Swap in", icon: "✅" },
  add: { chip: "bg-sea-soft text-sea", label: "Adds to your plan", icon: "➕" },
  not_for_trip: { chip: "bg-coral-soft text-coral", label: "Not for this trip", icon: "⚠️" },
  not_needed: { chip: "bg-sun-soft text-[#8a5d10]", label: "Not needed now", icon: "⏸" },
};

const NEED_IDS = Object.keys(NEED_TITLES) as NeedId[];
/** Timestamps for saved checks (only called from event handlers). */
const stamp = () => Date.now();
const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

/** Build the product to score from a saved check. */
function productOf(c: SavedCheck): { product: Product; types: NeedId[] } {
  if (c.catalogId) {
    const p = getProduct(c.catalogId)!;
    return { product: { ...p, needs: [c.type, ...p.needs.filter((n) => n !== c.type)] }, types: p.needs };
  }
  const r = productFromFound(c.found, c.type);
  return { product: r.product, types: r.types };
}

function evaluate(p: Passport, product: Product): CheckResult | null {
  const s = p.snapshot;
  if (!s.plan || !s.climate || !s.skin) return null;
  const daysUntil = s.trip.startDate ? Math.max(0, Math.round((new Date(`${s.trip.startDate}T12:00:00`).getTime() - Date.now()) / 86400000)) : undefined;
  return checkProduct({
    product,
    plan: s.plan,
    budget: s.budget,
    climate: s.climate,
    trip: { activities: s.trip.activities, transport: s.trip.transport, days: s.trip.days, daysUntil },
    scores: s.skin.scores,
    skinType: s.skin.skinType ?? null,
    bag: s.bag,
    ownedNeeds: s.ownedNeeds,
    preferredBrands: s.shelf.map((o) => o.brand).filter(Boolean),
  });
}

export default function ProductCheck({ passport }: { passport: Passport }) {
  const app = useApp();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState<{ query: string; tried: string[] } | null>(null);
  const [pasted, setPasted] = useState("");

  async function save(checks: SavedCheck[], patch: Partial<Passport["snapshot"]> = {}) {
    const fresh = (await getPassport(passport.id)) ?? passport;
    const next = { ...fresh, updatedAt: stamp(), checks, snapshot: { ...fresh.snapshot, ...patch } };
    await putPassport(next);
    // If this passport is the open plan, update it too.
    if (app.currentPassportId === passport.id && Object.keys(patch).length) setApp(patch);
  }

  async function addCheck(query: string, found: FoundProduct, catalogId?: string) {
    const types = catalogId ? getProduct(catalogId)!.needs : productFromFound(found).types;
    const at = stamp();
    const check: SavedCheck = { id: `c-${at}`, at, query, found, catalogId, type: types[0] };
    await save([check, ...passport.checks.filter((c) => c.query.toLowerCase() !== query.toLowerCase())]);
  }

  async function lookup() {
    const query = q.trim();
    if (query.length < 3) return setError("Type a product name, e.g. “La Roche-Posay Effaclar serum”.");
    setBusy(true);
    setError("");
    setNotFound(null);
    try {
      const res = await fetch("/api/products/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Lookup failed.");
      if (!d.hit) setNotFound({ query, tried: d.tried ?? [] });
      else {
        const { source, brand, name, ingredientsText, sourceUrl, claims, priceUsd, catalogId } = d.hit;
        await addCheck(query, { source, brand, name, ingredientsText, sourceUrl, claims, priceUsd }, catalogId);
        setQ("");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function usePasted() {
    if (!notFound || pasted.split(",").length < 5) return setError("Paste the full ingredient list (comma separated).");
    const words = notFound.query.split(/\s+/);
    await addCheck(notFound.query, { source: "pasted", brand: words[0], name: words.slice(1).join(" ") || notFound.query, ingredientsText: pasted, sourceUrl: "" });
    setNotFound(null);
    setPasted("");
    setQ("");
  }

  const setType = (id: string, type: NeedId) => save(passport.checks.map((c) => (c.id === id ? { ...c, type } : c)));
  const remove = (id: string) => save(passport.checks.filter((c) => c.id !== id));

  async function act(c: SavedCheck, product: Product, result: CheckResult, mode: "swap" | "add") {
    const s = passport.snapshot;
    let bag = s.bag.filter((id) => id !== product.id);
    if (mode === "swap" && result.ours) bag = bag.filter((id) => id !== result.ours!.id);
    bag = [...bag, product.id];
    const custom = c.catalogId ? s.customProducts : [...s.customProducts.filter((p) => p.id !== product.id), product];
    await save(passport.checks, { bag, customProducts: custom });
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em]">
        <span aria-hidden>🔎</span> Check a product
      </h3>
      <p className="mt-1 text-[12px] text-ink-soft">Type any product you&apos;re thinking of buying. We find its ingredients and score it for this skin and this trip.</p>
      <div className="mt-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !busy && lookup()}
          placeholder="e.g. Clinique Moisture Surge 100H"
          aria-label="Product name"
          className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink"
        />
        <button onClick={lookup} disabled={busy} className="shrink-0 rounded-xl bg-ink px-4 text-sm font-bold text-paper disabled:opacity-50">
          {busy ? "…" : "Check"}
        </button>
      </div>
      {busy && (
        <p className="mt-2 flex items-center gap-2 text-[12px] text-ink-soft">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-sea" aria-hidden />
          Looking in our catalog, Open Beauty Facts, then the web. This can take up to 30 seconds.
        </p>
      )}
      {error && <p className="mt-2 rounded-lg bg-coral-soft px-3 py-2 text-xs text-coral">{error}</p>}
      {notFound && (
        <div className="mt-3 rounded-xl bg-paper p-3 text-[12px]">
          <p>
            We couldn&apos;t find a full ingredient list for <b>{notFound.query}</b> (searched: {notFound.tried.join(", ")}). Paste it from the box or the brand&apos;s site:
          </p>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={3}
            placeholder="Water, Glycerin, Niacinamide, …"
            className="mt-2 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-xs outline-none focus:border-ink"
          />
          <button onClick={usePasted} className="mt-1 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-paper">
            Check with this list
          </button>
        </div>
      )}

      <ul className="mt-4 space-y-4">
        {passport.checks.map((c) => {
          const { product, types } = productOf(c);
          const r = evaluate(passport, product);
          if (!r) return null;
          const v = VERDICT_STYLE[r.verdict];
          const inBag = passport.snapshot.bag.includes(product.id);
          return (
            <li key={c.id} className="rounded-2xl border border-line p-3">
              <div className="flex items-start gap-3">
                <ProductShot product={product} size={56} />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{product.brand}</p>
                  <p className="text-sm font-semibold leading-snug">{product.name}</p>
                  <p className="mt-0.5 text-[10px] text-ink-soft">
                    Ingredients from{" "}
                    {c.found.sourceUrl ? (
                      <a href={c.found.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        {c.found.source === "catalog" ? SOURCE_LABEL.catalog : `${SOURCE_LABEL[c.found.source]} · ${hostOf(c.found.sourceUrl)}`} ↗
                      </a>
                    ) : (
                      SOURCE_LABEL[c.found.source]
                    )}
                    {c.found.source !== "catalog" && " · check the label"}
                  </p>
                </div>
                <button onClick={() => remove(c.id)} aria-label={`Remove ${product.name}`} className="text-xs text-ink-soft hover:text-coral">
                  ✕
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <label className="flex items-center gap-1 text-ink-soft">
                  Type
                  <select value={c.type} onChange={(e) => setType(c.id, e.target.value as NeedId)} className="rounded-lg border border-line bg-white px-1.5 py-0.5 text-ink">
                    {[...types, ...NEED_IDS.filter((n) => !types.includes(n))].map((n) => (
                      <option key={n} value={n}>
                        {NEED_TITLES[n]}
                      </option>
                    ))}
                  </select>
                </label>
                {product.concentrations?.map((k) => (
                  <span key={k.ingredient} className="rounded-full bg-ink px-2 py-0.5 font-semibold text-paper">
                    {concLabel(k)}
                    {strengthOf(k) === "high" ? " · High" : ""}
                  </span>
                ))}
                {product.spf && <span className="rounded-full bg-ink px-2 py-0.5 font-semibold text-paper">SPF {product.spf}</span>}
                <span className={`rounded-full px-2 py-0.5 font-semibold ${product.fragranceFree ? "bg-sea-soft text-sea" : "bg-sun-soft text-[#8a5d10]"}`}>
                  {product.fragranceFree ? "Fragrance-free" : "Contains fragrance"}
                </span>
              </div>

              {/* Verdict */}
              <div className="mt-3 rounded-xl bg-paper p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${v.chip}`}>
                      {v.icon} {v.label}
                    </span>
                    <p className="mt-1 text-sm font-semibold">{r.headline}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold tabular-nums leading-none">{r.need.score}</p>
                    <p className="text-[9px] uppercase tracking-wider text-ink-soft">{r.need.title} necessity</p>
                  </div>
                </div>
                {r.blockers.map((b) => (
                  <p key={b} className="mt-2 text-[12px] text-coral">
                    ⚠︎ {b}
                  </p>
                ))}
                {r.yours.targets.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">Targets</span>
                    {r.yours.targets.slice(0, 4).map((t) => (
                      <span key={t.key} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.band === "weak" ? "bg-coral-soft text-coral" : "bg-sun-soft text-[#8a5d10]"}`}>
                        {t.label.split(" (")[0]} {t.score}
                      </span>
                    ))}
                  </div>
                )}
                <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-ink-soft">
                  {r.yours.reasons.map((x) => (
                    <li key={x} className="flex gap-1.5">
                      <span aria-hidden className="text-sea">
                        ●
                      </span>
                      <span>
                        <Rich text={x} />
                      </span>
                    </li>
                  ))}
                </ul>
                {r.yours.cautions.map((x) => (
                  <p key={x} className="mt-1 text-[11px] text-[#8a5d10]">
                    ⚠︎ {x}
                  </p>
                ))}

                {/* Our pick, side by side */}
                {r.ours && (
                  <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-white p-2">
                    <ProductShot product={r.ours} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
                        {r.verdict === "swap_in" ? "Would replace" : "Our pick"} · {r.ours.brand}
                      </p>
                      <p className="line-clamp-1 text-[12px] font-medium">{r.ours.name}</p>
                      {r.oursInfo?.reasons[0] && (
                        <p className="line-clamp-2 text-[11px] text-ink-soft">
                          <Rich text={r.oursInfo.reasons[0]} />
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-bold tabular-nums leading-none">{r.need.score}</p>
                      <p className="text-[8px] uppercase tracking-wider text-ink-soft">necessity</p>
                      {r.ours.estPriceUsd ? <p className="text-[10px] text-ink-soft">~${r.ours.estPriceUsd}</p> : null}
                    </div>
                  </div>
                )}

                {(r.verdict === "swap_in" || r.verdict === "add") && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {inBag ? (
                      <span className="rounded-lg bg-sea px-3 py-2 text-xs font-bold text-white">✓ In this trip&apos;s bag</span>
                    ) : (
                      <>
                        {r.ours && r.verdict === "swap_in" && (
                          <button onClick={() => act(c, product, r, "swap")} className="rounded-lg bg-leaf px-3 py-2 text-xs font-bold text-white">
                            Replace our pick with this
                          </button>
                        )}
                        <button onClick={() => act(c, product, r, "add")} className="rounded-lg border border-ink bg-white px-3 py-2 text-xs font-bold">
                          Add to bag
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
