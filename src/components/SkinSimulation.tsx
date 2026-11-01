"use client";
// "After this plan": YouCam AI Skin Simulation of the user's own photo, improving only the
// concerns their chosen products address. Shown as a before/after slider on the action plan,
// and the "after" photo goes on the SkinPassport page.

import { useEffect, useRef, useState } from "react";
import { cropToFace } from "@/lib/faceCrop";
import { intensityWord, SIM_MAX, type SimPlan } from "@/lib/engine/simulation";
import { setApp, useApp } from "@/lib/store";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Status = { state: "idle" | "running" | "error"; error?: string };

async function runSimulation(photo: string, plan: SimPlan) {
  const before = await cropToFace(photo);
  const res = await fetch("/api/skin/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: before, intensities: plan.intensities }),
  });
  const start = await res.json();
  if (!res.ok) throw new Error(start.error || "Skin simulation failed.");
  if (start.status === "success") return { before, image: start.image as string, mock: !!start.mock };
  for (let i = 0; i < 45; i++) {
    await sleep(2000);
    const r = await fetch(`/api/skin/simulate?id=${encodeURIComponent(start.taskId)}`);
    const d = await r.json();
    if (!r.ok || d.status === "error") throw new Error(d.error || "Skin simulation failed.");
    if (d.status === "success") return { before, image: d.image as string, mock: false };
  }
  throw new Error("YouCam is taking too long. Try again in a minute.");
}

/** Runs the simulation when the plan changes (cached by photo + intensities). */
export function useSkinSimulation(photo: string | null, plan: SimPlan, key: string) {
  const { simulation } = useApp();
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const inflight = useRef<string | null>(null);
  const ready = simulation?.key === key ? simulation : null;
  const enabled = !!photo && plan.lines.length > 0;

  const start = () => {
    if (!photo || inflight.current === key) return;
    inflight.current = key;
    setStatus({ state: "running" });
    runSimulation(photo, plan)
      .then((r) => {
        if (inflight.current !== key) return;
        setApp({ simulation: { key, image: r.image, before: r.before, mock: r.mock } });
        setStatus({ state: "idle" });
      })
      .catch((e) => inflight.current === key && setStatus({ state: "error", error: (e as Error).message }))
      .finally(() => {
        if (inflight.current === key) inflight.current = null;
      });
  };

  useEffect(() => {
    if (enabled && !ready) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, !!ready]);

  return { ready, status, enabled, retry: start };
}

export default function SkinSimulation({
  photo,
  mirrored,
  plan,
  sim,
}: {
  photo: string | null;
  mirrored: boolean;
  plan: SimPlan;
  sim: ReturnType<typeof useSkinSimulation>;
}) {
  const [pos, setPos] = useState(55);
  const flip = mirrored ? { transform: "scaleX(-1)" } : undefined;

  return (
    <section className="mt-5 rounded-2xl bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold">
          <span aria-hidden>🪞</span> Your skin after this plan
        </p>
        <span className="rounded-full bg-sea-soft px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-sea">YouCam AI</span>
      </div>

      {!photo ? (
        <p className="rounded-xl bg-paper px-3 py-3 text-[12px] text-ink-soft">Scan with your camera or upload a selfie to see a simulation of your skin after this plan.</p>
      ) : !plan.lines.length ? (
        <p className="rounded-xl bg-paper px-3 py-3 text-[12px] text-ink-soft">Add products to your bag (or mark what you have) to see how they could change your skin.</p>
      ) : sim.ready ? (
        <>
          <div className="relative mx-auto aspect-square w-full max-w-[300px] select-none overflow-hidden rounded-xl bg-ink">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sim.ready.image} alt="Simulated skin after the plan" className="absolute inset-0 h-full w-full object-cover" style={flip} />
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sim.ready.before ?? photo} alt="Your skin today" className="absolute inset-0 h-full w-full object-cover" style={flip} />
            </div>
            <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${pos}%` }} />
            <div className="pointer-events-none absolute top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[11px] font-bold shadow" style={{ left: `${pos}%` }}>
              ⇆
            </div>
            <span className="absolute left-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-paper">Today</span>
            <span className="absolute right-2 top-2 rounded-full bg-leaf px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">After plan</span>
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-label="Compare today and after the plan"
              className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
            />
          </div>
          <ul className="mt-3 flex flex-wrap justify-center gap-1.5">
            {plan.lines.map((l) => (
              <li key={l.key} className="rounded-full border border-leaf/30 bg-leaf-soft px-2.5 py-1 text-[11px] text-leaf" title={`From your ${l.by.join(" + ").toLowerCase()}`}>
                <b>{l.label}</b> · {intensityWord(l.intensity)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-center text-[10px] leading-snug text-ink-soft">
            {sim.ready.mock ? "Demo mode: add a YouCam API key to see the real simulation. " : ""}
            Only concerns your products address are simulated, at up to {Math.round(SIM_MAX * 100)}% intensity. An AI visualization, not a guaranteed result.
          </p>
        </>
      ) : sim.status.state === "error" ? (
        <div className="rounded-xl bg-coral-soft px-3 py-3 text-[12px] text-coral">
          {sim.status.error}{" "}
          <button onClick={sim.retry} className="font-bold underline">
            Try again
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-paper px-3 py-4">
          <span className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-line border-t-sea" aria-hidden />
          <p className="text-[12px] text-ink-soft">
            Simulating <b className="text-ink">{plan.lines.map((l) => l.label.toLowerCase()).join(", ")}</b> with YouCam AI…
          </p>
        </div>
      )}
    </section>
  );
}
