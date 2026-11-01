"use client";
// My passports: every finished plan, saved on this device. Open one (read-only plan),
// rename or delete it, see how scores changed since the previous scan, and check products against it.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { bandFor, CORE, labelOf } from "@/lib/engine/report";
import { describeSkinType } from "@/lib/engine/skinType";
import { deletePassport, openPassport, putPassport, usePassports, type Passport } from "@/lib/passports";
import { resetAll } from "@/lib/store";
import type { ConcernKey } from "@/lib/types";
import { PassportStamp, stampPropsOf } from "./ActionPlanView";
import ProductCheck from "./ProductCheck";

const BAND_DOT = { weak: "bg-coral", normal: "bg-sun", strong: "bg-sea" } as const;
const fmt = (iso: string, add = 0) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + add);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** The passport page from the action plan, scaled down. */
function MiniStamp({ p, width = 150 }: { p: Passport; width?: number }) {
  if (!p.snapshot.plan) return null;
  const inner = 320;
  const scale = width / inner;
  return (
    <div className="shrink-0 overflow-visible" style={{ width, height: 190 * scale }} aria-hidden>
      <div style={{ width: inner, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <PassportStamp {...stampPropsOf(p.snapshot)} compact />
      </div>
    </div>
  );
}

/** Score change for each core measure vs the previous (older) passport. */
function Changes({ p, prev }: { p: Passport; prev?: Passport }) {
  const now = p.snapshot.skin?.scores;
  const then = prev?.snapshot.skin?.scores;
  if (!now) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1 text-[11px]">
      {CORE.map((k: ConcernKey) => {
        const v = now[k];
        if (typeof v !== "number") return null;
        const d = then && typeof then[k] === "number" ? v - (then[k] as number) : null;
        return (
          <span key={k} className="flex items-center gap-1 text-ink-soft">
            <span className={`h-2 w-2 rounded-full ${BAND_DOT[bandFor(v)]}`} />
            {labelOf(k).split(" (")[0]} <b className="text-ink tabular-nums">{v}</b>
            {d != null && d !== 0 && <span className={d > 0 ? "text-leaf" : "text-coral"}>{d > 0 ? `▲${d}` : `▼${-d}`}</span>}
          </span>
        );
      })}
    </div>
  );
}

function Detail({ p, prev, onBack }: { p: Passport; prev?: Passport; onBack: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(p.name);
  const [confirm, setConfirm] = useState(false);
  const s = p.snapshot;
  const rename = () => name.trim() && name.trim() !== p.name && putPassport({ ...p, name: name.trim().slice(0, 60) });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-6">
      <div className="space-y-4 lg:sticky lg:top-10">
      <button onClick={onBack} className="text-sm font-semibold text-ink-soft hover:text-ink">
        ‹ All passports
      </button>
      <div className="flex justify-center">
        <MiniStamp p={p} width={300} />
      </div>
      <section className="rounded-2xl bg-ink p-4 text-paper">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={rename}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              aria-label="Passport name"
              className="w-full rounded-md bg-transparent font-display text-xl leading-tight outline-none focus:bg-white/10"
            />
            <p className="mt-1 text-[11px] text-paper/70">
              {s.trip.origin?.name ?? "Home"} → {s.trip.destination?.name}
              {s.trip.startDate ? ` · ${fmt(s.trip.startDate)} – ${fmt(s.trip.startDate, s.trip.days - 1)}` : ""}
            </p>
            {describeSkinType(s.skin?.skinType) && <p className="text-[11px] text-paper/70">Skin type {describeSkinType(s.skin?.skinType)}</p>}
            <div className="[&_span]:text-paper/80 [&_b]:text-paper">
              <Changes p={p} prev={prev} />
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            openPassport(p);
            router.push("/plan");
          }}
          className="mt-4 w-full rounded-xl bg-coral py-3 text-sm font-bold text-white hover:bg-coral/90"
        >
          Action plan →
        </button>
        {prev && <p className="mt-2 text-[10px] text-paper/60">▲▼ compared with your previous scan ({prev.name}).</p>}
      </section>

      <div className="text-center">
        <button
          onClick={() => (confirm ? (deletePassport(p.id), onBack()) : setConfirm(true))}
          className={`text-xs ${confirm ? "font-bold text-coral" : "text-ink-soft underline"}`}
        >
          {confirm ? "Tap again to delete this passport" : "Delete passport"}
        </button>
      </div>
      </div>
      <ProductCheck passport={p} />
    </div>
  );
}

export default function ProfileView() {
  const router = useRouter();
  const list = usePassports();
  const [selected, setSelected] = useState<string | null>(null);
  const current = list?.find((p) => p.id === selected);

  return (
    <main className="with-nav mx-auto min-h-dvh max-w-md px-4 pb-10 pt-6 lg:max-w-5xl lg:px-10 lg:pt-10">
      <header className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">SkinPassport</p>
          <h1 className="font-display text-3xl leading-none lg:text-4xl">My Passports</h1>
          <p className="mt-2 text-[12px] text-ink-soft">Saved on this device only. Your photos never leave it.</p>
        </div>
        <button
          onClick={() => {
            resetAll();
            router.push("/trip");
          }}
          className="mb-1 shrink-0 whitespace-nowrap rounded-full bg-coral px-4 py-2.5 text-[12px] font-bold text-white shadow-sm hover:bg-coral/90"
        >
          + New trip
        </button>
      </header>

      {list === null ? null : current ? (
        <Detail key={current.id} p={current} prev={list[list.indexOf(current) + 1]} onBack={() => setSelected(null)} />
      ) : !list.length ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="text-3xl" aria-hidden>
            🛂
          </p>
          <p className="mt-2 font-display text-xl">No passports yet</p>
          <p className="mt-1 text-sm text-ink-soft">Plan a trip and scan your skin. Every plan is saved here.</p>
          <Link href="/trip" className="mt-4 inline-block rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white">
            Plan a trip
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          {list.map((p, i) => (
            <li key={p.id}>
              <button onClick={() => setSelected(p.id)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                <MiniStamp p={p} width={128} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{p.name}</p>
                  <p className="truncate text-[11px] text-ink-soft">
                    {p.snapshot.trip.origin?.name ?? "Home"} → {p.snapshot.trip.destination?.name}
                    {p.snapshot.bag.length ? ` · ${p.snapshot.bag.length} in bag` : ""}
                    {p.checks.length ? ` · ${p.checks.length} checked` : ""}
                  </p>
                  <Changes p={p} prev={list[i + 1]} />
                </div>
                <span className="self-center text-ink-soft" aria-hidden>
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
