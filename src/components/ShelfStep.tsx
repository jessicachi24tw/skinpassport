"use client";
// Step 3 (optional): products the user already uses. Used to
// (1) mark what they can bring from home, (2) check it meets the trip's needs (e.g. SPF),
// (3) recommend similar products from the brands they like, and (4) flag sun-sensitizing actives.

import { useEffect, useState } from "react";
import { NEED_TITLES } from "@/lib/engine/necessity";
import { fromText } from "@/lib/shelf";
import { setApp, useApp } from "@/lib/store";
import type { NeedId, OwnedProduct } from "@/lib/types";
import { Button, Card, ErrorText, StepTitle } from "./ui";

const NEEDS = Object.keys(NEED_TITLES) as NeedId[];

function useSearch(q: string) {
  const [state, setState] = useState<{ q: string; results: OwnedProduct[] } | null>(null);
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/products/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setState({ q: query, results: d.results ?? [] }))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);
  const fresh = state?.q === q.trim();
  return { results: fresh ? state!.results : [], loading: q.trim().length >= 2 && !fresh };
}

export default function ShelfStep({ busy, onDone }: { busy: boolean; onDone: () => void }) {
  const { shelf } = useApp();
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const { results, loading } = useSearch(q);

  const add = (p: OwnedProduct) => {
    if (!p.needs.length && !p.treatment) {
      setError(`What kind of product is “${p.name}”? Pick a type below.`);
    } else setError("");
    setApp((s) => ({ shelf: s.shelf.some((x) => x.id === p.id) ? s.shelf : [...s.shelf, p] }));
    setQ("");
  };
  const update = (id: string, patch: Partial<OwnedProduct>) => setApp((s) => ({ shelf: s.shelf.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  const remove = (id: string) => setApp((s) => ({ shelf: s.shelf.filter((p) => p.id !== id) }));

  const manual = () => {
    const name = q.trim();
    if (name.length < 2) return setError("Type a product name first.");
    add(fromText(name, ""));
  };

  const finish = () => {
    if (shelf.some((p) => !p.needs.length && !p.treatment)) return setError("Pick a type for each product, or remove it.");
    setError("");
    onDone();
  };

  return (
    <Card>
      <StepTitle n={3} title="What's already on your shelf?" hint="Optional. We'll check if it suits this trip, suggest similar picks from brands you like, and fill the gaps." />

      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && results[0] && add(results[0])}
          placeholder="Search a product or brand, e.g. CeraVe"
          aria-label="Search your products"
          className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-ink"
        />
        {q.trim().length >= 2 && (
          <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg">
            {results.map((r) => (
              <li key={r.id}>
                <button onClick={() => add(r)} className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-paper">
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{r.brand || "—"}</span>
                    <span className="block truncate">{r.name}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-ink-soft">{r.source === "catalog" ? "SkinPassport" : "Open Beauty Facts"}</span>
                </button>
              </li>
            ))}
            {loading && <li className="px-3 py-2 text-sm text-ink-soft">Searching…</li>}
            <li>
              <button onClick={manual} className="w-full px-3 py-2 text-left text-sm font-semibold text-sea hover:bg-paper">
                + Add “{q.trim()}” manually
              </button>
            </li>
          </ul>
        )}
      </div>

      {shelf.length > 0 && (
        <ul className="mt-4 space-y-2">
          {shelf.map((p) => (
            <li key={p.id} className="rounded-xl border border-line bg-paper/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {p.brand && <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{p.brand}</p>}
                  <p className="text-sm font-medium leading-snug">{p.name}</p>
                </div>
                <button onClick={() => remove(p.id)} aria-label={`Remove ${p.name}`} className="text-xs text-ink-soft hover:text-coral">
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
                {p.photosensitizing && <span className="rounded-full bg-sun-soft px-2 py-0.5 font-semibold text-[#8a5d10]">Retinoid / acid — sun-sensitive</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ErrorText>{error}</ErrorText>

      <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
        <Button variant="ghost" onClick={() => (setApp({ shelf: [] }), onDone())} disabled={busy}>
          Skip
        </Button>
        <Button variant="coral" onClick={finish} disabled={busy} className="py-3">
          {busy ? "Building your plan…" : shelf.length ? `See my plan (${shelf.length} on shelf) →` : "See my plan →"}
        </Button>
      </div>
    </Card>
  );
}
