"use client";

import Link from "next/link";
import { useState } from "react";
import { CATALOG } from "@/lib/shop/catalog";
import { toggleBag, useApp } from "@/lib/store";
import ProductShot from "./ProductShot";

/** Floating bag button + bottom sheet with the user's picked products. */
export default function Bag() {
  const { bag } = useApp();
  const [open, setOpen] = useState(false);
  const items = CATALOG.filter((p) => bag.includes(p.id));
  const total = items.reduce((t, p) => t + p.estPriceUsd, 0);

  if (!items.length && !open) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Open bag, ${items.length} items`}
        className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper shadow-xl transition hover:scale-105 active:scale-95"
      >
        <span aria-hidden>👜</span> Bag
        <span key={items.length} className="flex h-6 min-w-6 animate-[pop_.35s_ease-out] items-center justify-center rounded-full bg-coral px-1.5 text-xs tabular-nums">
          {items.length}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Your bag"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-md animate-[slideUp_.3s_ease-out] overflow-auto rounded-t-3xl bg-paper p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl">Your travel bag</h2>
              <button onClick={() => setOpen(false)} className="rounded-full bg-white px-3 py-1.5 text-sm">
                Close
              </button>
            </div>
            {!items.length ? (
              <p className="py-8 text-center text-sm text-ink-soft">Your bag is empty. Add products from your plan.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl bg-white p-3">
                    <ProductShot product={p} size={52} />
                    <Link href={`/product/${p.id}`} onClick={() => setOpen(false)} className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{p.brand}</p>
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-ink-soft">~${p.estPriceUsd} est.</p>
                    </Link>
                    <div className="flex flex-col items-end gap-1">
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-coral px-2.5 py-1.5 text-xs font-bold text-white">
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
            <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
              <p className="text-sm text-ink-soft">Estimated total</p>
              <p className="font-display text-2xl tabular-nums">${total}</p>
            </div>
            <p className="mt-1 text-[11px] text-ink-soft">Each Buy button opens the retailer. Prices are estimates.</p>
            {items.length > 0 && (
              <Link href="/plan" onClick={() => setOpen(false)} className="mt-4 block rounded-xl bg-coral py-3 text-center text-sm font-bold text-white hover:bg-coral/90">
                Create my action plan →
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
