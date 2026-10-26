"use client";

import { geoDistance, geoInterpolate, geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import landTopo from "world-atlas/land-110m.json";
import type { Place, Transport } from "@/lib/types";

const W = 360;
const H = 188;
const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
const LAND = feature(topo, topo.objects.land);

/** World map projection rotated so the route sits in the middle (no wrap-around). */
function makeMap(centerLon: number) {
  const projection = geoNaturalEarth1()
    .rotate([-centerLon, 0])
    .fitExtent(
      [
        [4, 4],
        [W - 4, H - 4],
      ],
      { type: "Sphere" },
    );
  const path = geoPath(projection);
  return { projection, land: path(LAND) ?? "", grid: path(geoGraticule10()) ?? "", sphere: path({ type: "Sphere" }) ?? "" };
}
const DEFAULT_MAP = makeMap(0);

const SPEED_KMH: Record<Transport, number> = { plane: 800, train: 180, car: 80, bus: 70, subway: 35, ship: 35 };
const ICON: Record<Transport, string> = { plane: "", train: "🚄", car: "🚗", bus: "🚌", subway: "🚇", ship: "🛳️" };
const ORDER: Transport[] = ["plane", "ship", "train", "bus", "car", "subway"];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function travelTime(km: number, mode: Transport) {
  const h = km / SPEED_KMH[mode] + (mode === "plane" ? 1 : 0);
  if (h < 1) return `~${Math.max(5, Math.round((h * 60) / 5) * 5)} min`;
  return `~${Math.round(h)} h`;
}

export default function TripMap({ origin, destination, transport }: { origin: Place | null; destination: Place | null; transport: Transport[] }) {
  const mode = ORDER.find((m) => transport.includes(m)) ?? "plane";
  const [t, setT] = useState(0);
  const [run, setRun] = useState(0);
  const raf = useRef<number | null>(null);

  const route = useMemo(() => {
    if (!origin || !destination) return null;
    const a: [number, number] = [origin.lon, origin.lat];
    const b: [number, number] = [destination.lon, destination.lat];
    const interp = geoInterpolate(a, b);
    const map = makeMap(interp(0.5)[0]);
    const projection = map.projection;
    const pts = Array.from({ length: 97 }, (_, i) => projection(interp(i / 96)) as [number, number]);
    // Split the line where it wraps around the edge of the map (antimeridian).
    let d = "";
    pts.forEach((p, i) => {
      const prev = pts[i - 1];
      d += `${!prev || Math.abs(p[0] - prev[0]) > W / 2 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    });
    const km = Math.round(geoDistance(a, b) * 6371);
    return { interp, d, km, map };
  }, [origin, destination]);

  useEffect(() => {
    if (!route) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = Math.min(3200, 1400 + route.km / 6);
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = reduced ? 1 : Math.min(1, (now - t0) / duration);
      setT(ease(p));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [route, run]);

  const map = route?.map ?? DEFAULT_MAP;
  const projection = map.projection;
  const pin = (p: Place | null) => (p ? (projection([p.lon, p.lat]) as [number, number]) : null);
  const o = pin(origin);
  const dst = pin(destination);

  let vehicle: { x: number; y: number; angle: number } | null = null;
  if (route) {
    const tt = Math.min(0.999, t);
    const p1 = projection(route.interp(tt)) as [number, number];
    const p2 = projection(route.interp(Math.min(1, tt + 0.01))) as [number, number];
    const angle = (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI;
    vehicle = { x: p1[0], y: p1[1], angle: Math.abs(p2[0] - p1[0]) > W / 2 ? 0 : angle };
  }
  const arrived = route && t >= 0.999;

  return (
    <div className="overflow-hidden rounded-2xl bg-ink">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={route ? `Route from ${origin!.name} to ${destination!.name}` : "World map"}>
        <path d={map.sphere} fill="#26345a" />
        <path d={map.grid} fill="none" stroke="#ffffff" strokeOpacity={0.06} strokeWidth={0.4} />
        <path d={map.land} fill="#3b4b74" stroke="#4d5f8c" strokeWidth={0.3} />
        {route && (
          <>
            <path d={route.d} fill="none" stroke="#ffffff" strokeOpacity={0.25} strokeWidth={1} strokeDasharray="2 2.5" />
            <path d={route.d} fill="none" stroke="#e0674f" strokeWidth={1.4} strokeLinecap="round" pathLength={1} strokeDasharray={`${t} 1`} />
          </>
        )}
        {o && (
          <g>
            <circle cx={o[0]} cy={o[1]} r={3} fill="#5fd0bf" stroke="#fff" strokeWidth={0.8} />
            <text x={o[0]} y={o[1] - 6} textAnchor="middle" fontSize={8} fill="#fff" fontWeight={600}>
              {origin!.name}
            </text>
          </g>
        )}
        {dst && (
          <g>
            {arrived && (
              <circle cx={dst[0]} cy={dst[1]} r={3} fill="none" stroke="#e0674f" strokeWidth={1}>
                <animate attributeName="r" from="3" to="12" dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="1" to="0" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx={dst[0]} cy={dst[1]} r={3.2} fill="#e0674f" stroke="#fff" strokeWidth={0.8} />
            <text x={dst[0]} y={dst[1] + 13} textAnchor="middle" fontSize={8} fill="#fff" fontWeight={600}>
              {destination!.name}
            </text>
          </g>
        )}
        {vehicle && !arrived && (
          <g transform={`translate(${vehicle.x} ${vehicle.y})`}>
            {mode === "plane" ? (
              <g transform={`rotate(${vehicle.angle + 90}) scale(0.55)`}>
                <path d="M0,-12 L2,-4 L11,2 L11,4.5 L2,1.5 L1.6,8 L5,10.5 L5,12.5 L0,11 L-5,12.5 L-5,10.5 L-1.6,8 L-2,1.5 L-11,4.5 L-11,2 L-2,-4 Z" fill="#fff" stroke="#1f2a44" strokeWidth={0.8} />
              </g>
            ) : (
              <text textAnchor="middle" dominantBaseline="central" fontSize={11}>
                {ICON[mode]}
              </text>
            )}
          </g>
        )}
      </svg>
      <div className="flex items-center justify-between px-4 py-2.5 text-xs text-paper">
        {route ? (
          <>
            <span>
              <b className="tabular-nums">{route.km.toLocaleString("en-US")} km</b> · {travelTime(route.km, mode)} by {mode}
            </span>
            <button onClick={() => setRun((r) => r + 1)} className="rounded-full bg-white/10 px-3 py-1 font-semibold hover:bg-white/20">
              ↻ Replay
            </button>
          </>
        ) : (
          <span className="text-paper/70">{origin || destination ? "Add both places to see your route" : "Pick where you're leaving from and where you're going"}</span>
        )}
      </div>
    </div>
  );
}
