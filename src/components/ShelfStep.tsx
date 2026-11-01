"use client";
// Step 3 (optional): products the user already uses. Used to
// (1) mark what they can bring from home, (2) check it meets the trip's needs (e.g. SPF),
// (3) recommend similar products from the brands they like, and (4) flag sun-sensitizing actives.

import { useState } from "react";
import { NEED_TITLES } from "@/lib/engine/necessity";
import { fromText } from "@/lib/shelf";
import { SHELF_BRANDS, SHELF_PRESETS, shelfProductsOf } from "@/lib/shop/shelfPresets";
import { setApp, useApp } from "@/lib/store";
import { CATALOG } from "@/lib/shop/catalog";
import type { NeedId, OwnedProduct, Product } from "@/lib/types";
import ProductShot from "./ProductShot";
import { Button, Card, ErrorText, StepTitle } from "./ui";

const NEEDS = Object.keys(NEED_TITLES) as NeedId[];
const OTHER = "__other";
const FIELD = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink";
// Custom chevron, inset from the right edge so it always sits inside the box.
const SELECT = `${FIELD} appearance-none truncate pr-9`;
const CHEVRON: React.CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5l5 5 5-5' fill='none' stroke='%234a5672' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  backgroundSize: "12px 8px",
};

/** A shelf item as a Product, for the pack shot: the catalog entry, or a look-alike from its type. */
function shotOf(p: OwnedProduct): Product {
  const cat = p.catalogId ? CATALOG.find((c) => c.id === p.catalogId) : undefined;
  if (cat) return cat;
  const n = p.needs[0];
  const texture = n === "barrier_cream" ? "rich" : n === "gel_moisturizer" ? "gel" : n === "face_mist" ? "spray" : n === "lip_care" ? "balm" : "light";
  return { id: p.id, brand: p.brand, name: p.name, needs: p.needs, spf: p.spf, texture, ingredients: [], estPriceUsd: 0, tier: "value", loreal: false, url: "", when: "both" } as unknown as Product;
}

export default function ShelfStep({ busy, onDone }: { busy: boolean; onDone: () => void }) {
  const { shelf } = useApp();
  const [brand, setBrand] = useState("");
  const [productId, setProductId] = useState("");
  const [otherBrand, setOtherBrand] = useState("");
  const [otherName, setOtherName] = useState("");
  const [error, setError] = useState("");
  const products = brand && brand !== OTHER ? shelfProductsOf(brand) : [];
  const typing = brand === OTHER || productId === OTHER;

  const add = (p: OwnedProduct) => {
    if (!p.needs.length && !p.treatment) {
      setError(`What kind of product is “${p.name}”? Pick a type below.`);
    } else setError("");
    setApp((s) => ({ shelf: s.shelf.some((x) => x.id === p.id) ? s.shelf : [...s.shelf, p] }));
    setProductId("");
    setOtherName("");
  };
  const update = (id: string, patch: Partial<OwnedProduct>) => setApp((s) => ({ shelf: s.shelf.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const remove = (id: string) => setApp((s) => ({ shelf: s.shelf.filter((p) => p.id !== id) }));

  const addSelected = () => {
    if (!brand) return setError("Pick a brand first.");
    if (!typing) {
      const p = SHELF_PRESETS.find((x) => x.id === productId);
      return p ? add(p) : setError("Pick a product.");
    }
    const b = brand === OTHER ? otherBrand.trim() : brand;
    const name = otherName.trim();
    if (name.length < 2) return setError("Type the product name.");
    add(fromText(name, b));
  };

  const finish = () => {
    if (shelf.some((p) => !p.needs.length && !p.treatment)) return setError("Pick a type for each product, or remove it.");
    setError("");
    onDone();
  };

  return (
    <Card>
      <StepTitle n={3} title="Add your shelf" optional hint="Tell us what you already use. We'll check if it suits this trip, suggest similar picks from brands you like, and fill the gaps." />

      {/* Brand → product, like country → city. "Other…" lets you type anything. */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Brand</span>
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setProductId("");
              setError("");
            }}
            className={SELECT}
            style={CHEVRON}
          >
            <option value="">Choose a brand…</option>
            {SHELF_BRANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            <option value={OTHER}>Other brand…</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">Product</span>
          {brand === OTHER ? (
            <input value={otherBrand} onChange={(e) => setOtherBrand(e.target.value)} placeholder="Brand name" aria-label="Brand name" className={FIELD} />
          ) : (
            <select
              value={productId}
              disabled={!brand}
              onChange={(e) => {
                setProductId(e.target.value);
                setError("");
              }}
              className={`${SELECT} disabled:bg-paper disabled:text-ink-soft`}
              style={CHEVRON}
            >
              <option value="">{brand ? "Choose a product…" : "Pick a brand first"}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id} disabled={shelf.some((x) => x.id === p.id)}>
                  {p.name}
                  {p.treatment ? " · Treatment" : p.needs[0] ? ` · ${NEED_TITLES[p.needs[0]]}` : ""}
                </option>
              ))}
              <option value={OTHER}>Other product…</option>
            </select>
          )}
        </label>
        <button
          onClick={addSelected}
          disabled={!brand || (!typing && !productId)}
          className="h-[42px] rounded-xl bg-ink px-3.5 text-sm font-semibold text-paper transition hover:bg-ink/90 disabled:bg-line disabled:text-ink-soft"
        >
          + Add
        </button>
      </div>
      {typing && (
        <input
          value={otherName}
          onChange={(e) => setOtherName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSelected()}
          placeholder="Product name, e.g. Daily Moisturizer SPF 30"
          aria-label="Product name"
          className={`${FIELD} mt-2`}
        />
      )}

      {shelf.length > 0 && (
        <ul className="mt-4 space-y-2">
          {shelf.map((p) => (
            <li key={p.id} className="rounded-xl border border-line bg-white p-3.5">
              <div className="flex items-center gap-3">
                <ProductShot product={shotOf(p)} size={56} />
                <div className="min-w-0 flex-1">
                  {p.brand && <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{p.brand}</p>}
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</p>
                </div>
                <button onClick={() => remove(p.id)} aria-label={`Remove ${p.name}`} className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-soft hover:border-coral hover:text-coral">
                  Remove
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <label className="flex items-center gap-1">
                  <span className="text-ink-soft">Type</span>
                  <select
                    value={p.treatment ? "treatment" : (p.needs[0] ?? "")}
                    onChange={(e) =>
                      e.target.value === "treatment"
                        ? update(p.id, { needs: [], treatment: true })
                        : update(p.id, { needs: e.target.value ? [e.target.value as NeedId] : [], treatment: undefined })
                    }
                    className="rounded-lg border border-line bg-white px-2 py-1"
                  >
                    <option value="">Choose…</option>
                    {NEEDS.map((n) => (
                      <option key={n} value={n}>
                        {NEED_TITLES[n]}
                      </option>
                    ))}
                    <option value="treatment">Treatment (retinol, acids…)</option>
                  </select>
                </label>
                {p.needs.includes("sunscreen") && (
                  <label className="flex items-center gap-1">
                    <span className="text-ink-soft">SPF</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={p.spf ?? ""}
                      onChange={(e) => update(p.id, { spf: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-16 rounded-lg border border-line bg-white px-2 py-1"
                    />
                  </label>
                )}
                {p.photosensitizing && <span className="rounded-full bg-sun-soft px-2 py-0.5 font-semibold text-[#8a5d10]">Retinoid / acid: sun-sensitive</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ErrorText>{error}</ErrorText>

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        <Button variant="coral" onClick={finish} disabled={busy} className="py-3">
          {busy ? "Building your plan…" : shelf.length ? `See my plan (${shelf.length} on shelf) →` : "See my plan →"}
        </Button>
        <Button variant="ghost" onClick={() => (setApp({ shelf: [] }), onDone())} disabled={busy}>
          Skip
        </Button>
      </div>
    </Card>
  );
}
