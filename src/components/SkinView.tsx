"use client";
// Skin analysis tab: the latest scan (from the most recent passport), plus
// "Plan a trip" (the full 4-step flow) and "New scan" (rescan for the same trip).

import { useRouter } from "next/navigation";
import { describeSkinType } from "@/lib/engine/skinType";
import { usePassports } from "@/lib/passports";
import { INITIAL, resetAll, setApp } from "@/lib/store";
import ScanResult from "./ScanResult";

const fmtDay = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function SkinView() {
  const router = useRouter();
  const list = usePassports();
  const latest = list?.find((p) => p.snapshot.skin);
  const s = latest?.snapshot;

  const planTrip = () => {
    resetAll();
    router.push("/trip");
  };
  const newScan = () => {
    if (!s) return planTrip();
    // Same trip, fresh scan: start the flow at step 2.
    setApp({ ...INITIAL, trip: s.trip, climate: s.climate, originClimate: s.originClimate, shelf: s.shelf, step: "scan" });
    router.push("/trip");
  };

  return (
    <main className="with-nav mx-auto min-h-dvh max-w-md px-4 pb-10 pt-6 lg:max-w-5xl lg:px-10 lg:pt-10">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-coral">{latest ? `Latest scan · ${fmtDay(latest.createdAt)}` : "SkinPassport"}</p>
        <h1 className="font-display text-3xl leading-none lg:text-4xl">Skin Analysis</h1>
      </header>

      {list === null ? null : !s?.skin ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center lg:max-w-md">
          <p className="font-display text-xl">No scan yet</p>
          <p className="mt-1 text-sm text-ink-soft">Plan a trip and scan your skin with YouCam AI. Your results show up here.</p>
          <button onClick={planTrip} className="mt-4 rounded-xl bg-coral px-5 py-3 text-sm font-bold text-white">
            Plan a trip
          </button>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="space-y-4 lg:sticky lg:top-10">
            <section className="flex items-center gap-3 rounded-2xl bg-ink p-4 text-paper">
              {s.photo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photo} alt="" className="h-20 w-16 shrink-0 rounded-xl object-cover" style={s.photoMirrored ? { transform: "scaleX(-1)" } : undefined} />
              )}
              <div className="min-w-0">
                {describeSkinType(s.skin.skinType) && (
                  <>
                    <p className="text-[11px] text-paper/70">Skin type</p>
                    <p className="font-bold">{describeSkinType(s.skin.skinType)}</p>
                  </>
                )}
                {s.skin.overall != null && (
                  <p className="mt-1 text-xs text-paper/70">
                    Overall <b className="text-paper">{s.skin.overall}</b>
                    {s.skin.skinAge != null && (
                      <>
                        {" "}
                        · Skin age <b className="text-paper">{s.skin.skinAge}</b>
                      </>
                    )}
                  </p>
                )}
                <p className="mt-1 truncate text-[11px] text-paper/70">Trip risk for {s.trip.destination?.name ?? "your last trip"}</p>
              </div>
            </section>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={newScan} className="flex h-16 items-center gap-2.5 rounded-2xl bg-coral px-3.5 text-left text-white hover:bg-coral/90">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                  <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
                  <circle cx="9.5" cy="10.5" r="0.8" />
                  <circle cx="14.5" cy="10.5" r="0.8" />
                  <path d="M9.5 14.5c1.4 1.2 3.6 1.2 5 0" />
                </svg>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">New scan</span>
                  <span className="block text-[11px] text-white/85">Same trip, today&apos;s skin</span>
                </span>
              </button>
              <button onClick={planTrip} className="flex h-16 items-center gap-2.5 rounded-2xl border border-ink bg-white px-3.5 text-left hover:bg-paper">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                  <path d="M10.5 13.5 4 11l1.5-1.5 7 1 4-4a2.1 2.1 0 0 1 3 3l-4 4 1 7L16 22l-2.5-6.5L10 19v2.5L8.5 23 7 19l-4-1.5L4.5 16H7l3.5-2.5z" />
                </svg>
                <span className="min-w-0">
                  <span className="block text-sm font-bold">Plan a trip</span>
                  <span className="block text-[11px] text-ink-soft">New destination</span>
                </span>
              </button>
            </div>
          </div>

          <section className="rounded-2xl border border-line bg-white p-4 lg:p-6">
            <ScanResult skin={s.skin} photo={s.photo} mirrored={s.photoMirrored} climate={s.climate} origin={s.originClimate} trip={s.trip} />
          </section>
        </div>
      )}
    </main>
  );
}
