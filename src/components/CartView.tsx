"use client";
// Shopping cart tab: the bag of the most recent passport. Opening this tab makes that
// passport the current plan, so removing items here updates its action plan too.

import Link from "next/link";
import { useEffect } from "react";
import { NEED_TITLES } from "@/lib/engine/necessity";
import { openPassport, snapshotOf, usePassportAutosave, usePassports } from "@/lib/passports";
import { bagProducts, toggleBag, useApp } from "@/lib/store";
import { stampPropsOf } from "./ActionPlanView";
import ProductShot from "./ProductShot";

export default function CartView() {
  const app = useApp();
  const list = usePassports();
  const latest = list?.find((p) => p.snapshot.plan);
  usePassportAutosave(app);

  useEffect(() => {
    if (latest && app.currentPassportId !== latest.id) openPassport(latest);
  }, [latest, app.currentPassportId]);

  const ready = !!latest && app.currentPassportId === latest.id && !!app.plan;
  const items = ready ? bagProducts(app) : [];
  const total = items.reduce((t, p) => t + p.estPriceUsd, 0);
  const stamp = ready ? stampPropsOf(snapshotOf(app)) : null;
  const fmt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <main className="with-nav mx-auto min-h-dvh max-w-md px-4 pb-10 pt-6 lg:max-w-5xl lg:px-10 lg:pt-10">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">
          {ready && app.trip.destination ? `For ${app.trip.destination.name}${app.trip.startDate ? ` · ${fmt(app.trip.startDate)}` : ""}` : "SkinPassport"}
        </p>
        <h1 className="font-display text-3xl leading-none lg:text-4xl">Shopping Cart</h1>
      </header>

      {list === null ? null : !latest ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center lg:max-w-md">
          <p className="font-display text-xl">Your cart is empty</p>
          <p className="mt-1 text-sm text-ink-soft">Plan a trip first. The products you pick land here.</p>
          <Link href="/skin" className="mt-4 inline-block rounded-xl bg-coral px-5 py-3 text-sm font-bold text-white">
            Go to Skin Analysis
          </Link>
        </div>
      ) : !ready ? null : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-start">
          <div className="space-y-3">
            {stamp && (
              <p className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-[13px] ${stamp.missing.length ? "bg-sun-soft text-[#7a5410]" : "bg-leaf-soft text-[#1e6b41]"}`}>
                <span aria-hidden>{stamp.missing.length ? "⚠︎" : "✓"}</span>
                {stamp.missing.length ? (
                  <span>
                    <b>
                      {stamp.covered} of {stamp.must} must-packs covered.
                    </b>{" "}
                    Still missing: {stamp.missing.map((n) => n.title.toLowerCase()).join(", ")}.
                  </span>
                ) : (
                  <span>
                    <b>All {stamp.must} must-packs covered.</b> Well protected.
                  </span>
                )}
              </p>
            )}

            {items.length === 0 ? (
              <p className="rounded-2xl bg-white p-6 text-center text-sm text-ink-soft">Nothing in the cart yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
                    <ProductShot product={p} size={56} />
                    <Link href={p.id.startsWith("check-") ? p.url : `/product/${p.id}`} className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{p.brand}</p>
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</p>
                      <p className="mt-0.5 text-[11px] text-ink-soft">
                        {NEED_TITLES[p.needs[0]]}
                        {p.estPriceUsd ? ` · ~$${p.estPriceUsd}` : " · your pick"}
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex h-10 items-center rounded-xl bg-coral px-4 text-sm font-bold text-white hover:bg-coral/90">
                        Buy
                      </a>
                      <button onClick={() => toggleBag(p.id)} className="text-[11px] text-ink-soft hover:text-coral">
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/trip" className="block text-center text-[12px] font-semibold text-sea hover:underline">
              + Add more from your plan
            </Link>
          </div>

          <aside className="space-y-3 rounded-2xl border border-line bg-white p-4 lg:sticky lg:top-10">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-ink-soft">Estimated total</span>
              <span className="font-display text-3xl tabular-nums">${Math.round(total)}</span>
            </div>
            <p className="text-[11px] text-ink-soft">{items.length} item{items.length === 1 ? "" : "s"} · prices are estimates, each Buy opens the retailer.</p>
            <Link href="/plan" className="flex h-12 items-center justify-center rounded-xl bg-ink text-sm font-bold text-paper hover:bg-ink/90">
              Create my action plan →
            </Link>
            <p className="text-center text-[11px] text-ink-soft">
              From <b className="text-ink">{latest.name}</b>
            </p>
          </aside>
        </div>
      )}
    </main>
  );
}
