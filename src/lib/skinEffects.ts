"use client";
// Step 4 visual: where each concern sits on the face, and an "If you skip" illustration.
// Zones come from the MediaPipe face mesh of the user's photo. The "If you skip" picture is
// drawn here in the browser: mild, realistic changes (drier, redder, shinier, duller…) only in
// the zones of the concerns this trip puts at risk. It is an illustration, not a prediction.

import type { Landmarks } from "./faceMesh";
import type { ConcernKey, RiskLevel } from "./types";

export type ZoneId = "forehead" | "nose" | "leftCheek" | "rightCheek" | "chin" | "leftEye" | "rightEye" | "face";
export interface Zone {
  x: number;
  y: number;
  rx: number;
  ry: number;
}
export type Zones = Record<ZoneId, Zone>;

/** Zones in image pixels, sized from the face width. Landmark ids are MediaPipe's face mesh. */
export function zonesOf(lm: Landmarks, w: number, h: number): Zones {
  const P = (i: number) => ({ x: lm[i].x * w, y: lm[i].y * h });
  const fw = Math.hypot(P(454).x - P(234).x, P(454).y - P(234).y);
  const z = (i: number, rx: number, ry: number, dy = 0): Zone => ({ x: P(i).x, y: P(i).y + dy * fw, rx: rx * fw, ry: ry * fw });
  return {
    forehead: z(151, 0.26, 0.1, 0.02),
    nose: z(5, 0.075, 0.15),
    leftCheek: z(50, 0.14, 0.12, 0.02),
    rightCheek: z(280, 0.14, 0.12, 0.02),
    chin: z(175, 0.13, 0.07, -0.02),
    leftEye: z(33, 0.05, 0.04, 0.01),
    rightEye: z(263, 0.05, 0.04, 0.01),
    face: z(4, 0.48, 0.62, -0.05),
  };
}

/** Where each concern shows, and the zone its label points to. */
export const CONCERN_ZONES: Record<ConcernKey, { zones: ZoneId[]; pin: ZoneId }> = {
  moisture: { zones: ["leftCheek", "rightCheek"], pin: "leftCheek" },
  texture: { zones: ["leftCheek", "rightCheek"], pin: "rightCheek" },
  redness: { zones: ["leftCheek", "rightCheek", "nose"], pin: "rightCheek" },
  oiliness: { zones: ["forehead", "nose", "chin"], pin: "nose" },
  pore: { zones: ["nose", "leftCheek", "rightCheek"], pin: "nose" },
  acne: { zones: ["chin", "leftCheek", "rightCheek"], pin: "chin" },
  age_spot: { zones: ["leftCheek", "rightCheek"], pin: "leftCheek" },
  radiance: { zones: ["face"], pin: "forehead" },
  wrinkle: { zones: ["forehead", "leftEye", "rightEye"], pin: "rightEye" },
};

/** Short tag text, as few words as possible. */
export const SHORT: Record<ConcernKey, { bad: string; skip: string; good: string }> = {
  moisture: { bad: "Dryness", skip: "Drier, flaky", good: "Hydration" },
  oiliness: { bad: "Shine", skip: "Shinier", good: "Oil balance" },
  redness: { bad: "Redness", skip: "Redder", good: "Calm skin" },
  age_spot: { bad: "Dark spots", skip: "Spots darken", good: "Even tone" },
  acne: { bad: "Breakouts", skip: "More breakouts", good: "Clear skin" },
  pore: { bad: "Pores", skip: "Pores show more", good: "Pores" },
  texture: { bad: "Rough texture", skip: "Rougher", good: "Smooth texture" },
  radiance: { bad: "Dullness", skip: "Duller", good: "Radiance" },
  wrinkle: { bad: "Fine lines", skip: "Lines show more", good: "Smooth lines" },
};

/** Soft oval of colour (fades out at the edge), drawn with the given blend mode. */
function blob(ctx: CanvasRenderingContext2D, z: Zone, rgb: string, alpha: number, op: GlobalCompositeOperation = "source-over", grow = 1) {
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.translate(z.x, z.y);
  ctx.scale(z.rx * grow, z.ry * grow);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.55, `rgba(${rgb},${alpha * 0.8})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

/** Small seeded random so the picture is the same every time. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
/** A random point inside a zone, denser towards the middle. */
function pointIn(z: Zone, r: () => number) {
  const a = r() * Math.PI * 2;
  const d = Math.sqrt(r()) * 0.85;
  return { x: z.x + Math.cos(a) * z.rx * d, y: z.y + Math.sin(a) * z.ry * d };
}

/** Mark today's concerns on the face: coral where the trip adds risk, green where skin is fine. */
export function drawMarks(ctx: CanvasRenderingContext2D, zones: Zones, marks: { key: ConcernKey; good: boolean }[]) {
  for (const m of marks) {
    for (const id of CONCERN_ZONES[m.key].zones) {
      if (id === "face") continue;
      blob(ctx, zones[id], m.good ? "47,154,87" : "224,103,79", m.good ? 0.32 : 0.5, "source-over", 1.05);
    }
  }
}

/** "If you skip": mild, realistic changes in the zones of the concerns at risk. */
export function drawSkip(ctx: CanvasRenderingContext2D, zones: Zones, risks: { key: ConcernKey; risk: RiskLevel }[]) {
  const fw = zones.face.rx / 0.48;
  const r = rng(7);
  for (const { key, risk } of risks) {
    const k = risk === "high" ? 1 : risk === "medium" ? 0.65 : 0;
    if (!k) continue;
    const zs = CONCERN_ZONES[key].zones.map((id) => zones[id]);
    switch (key) {
      case "moisture":
      case "texture": {
        for (const z of zs) {
          blob(ctx, z, "128,128,128", 0.45 * k, "saturation", 1.2); // loses colour
          blob(ctx, z, "236,226,214", 0.2 * k, "screen", 1.15); // ashy
        }
        // Fine dry flakes
        ctx.save();
        for (const z of zs)
          for (let i = 0; i < 220 * k; i++) {
            const p = pointIn(z, r);
            const s = fw * (0.002 + r() * 0.004);
            ctx.fillStyle = r() < 0.7 ? `rgba(255,250,244,${0.25 + r() * 0.25})` : `rgba(90,65,55,${0.12 + r() * 0.1})`;
            ctx.fillRect(p.x, p.y, s * (1 + r()), s);
          }
        ctx.restore();
        break;
      }
      case "redness":
        for (const z of zs) blob(ctx, z, "232,96,86", 0.42 * k, "multiply", 1.15);
        break;
      case "oiliness":
        for (const z of zs) blob(ctx, { ...z, rx: z.rx * 0.45, ry: z.ry * 0.55 }, "255,252,245", 0.42 * k, "screen");
        break;
      case "radiance":
        blob(ctx, zones.face, "196,190,184", 0.3 * k, "multiply");
        blob(ctx, zones.face, "128,128,128", 0.25 * k, "saturation");
        break;
      case "age_spot":
        for (const z of zs)
          for (let i = 0; i < 7 * k; i++) {
            const p = pointIn(z, r);
            const s = fw * (0.009 + r() * 0.012);
            blob(ctx, { x: p.x, y: p.y, rx: s, ry: s * 0.85 }, "125,80,58", 0.45, "multiply");
          }
        break;
      case "acne":
        for (const z of zs)
          for (let i = 0; i < 3 * k; i++) {
            const p = pointIn(z, r);
            const s = fw * (0.012 + r() * 0.01);
            blob(ctx, { x: p.x, y: p.y, rx: s * 1.8, ry: s * 1.6 }, "220,90,80", 0.35, "multiply");
            blob(ctx, { x: p.x, y: p.y, rx: s, ry: s }, "190,60,55", 0.55, "multiply");
            blob(ctx, { x: p.x - s * 0.3, y: p.y - s * 0.3, rx: s * 0.3, ry: s * 0.3 }, "255,245,240", 0.5, "screen");
          }
        break;
      case "pore":
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        for (const z of zs)
          for (let i = 0; i < 160 * k; i++) {
            const p = pointIn({ ...z, rx: z.rx * 0.7, ry: z.ry * 0.7 }, r);
            ctx.fillStyle = `rgba(110,75,60,${0.18 + r() * 0.12})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, fw * 0.0035, 0, Math.PI * 2);
            ctx.fill();
          }
        ctx.restore();
        break;
      case "wrinkle": {
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.lineCap = "round";
        ctx.strokeStyle = `rgba(110,72,58,${0.3 * k})`;
        ctx.lineWidth = fw * 0.004;
        const f = zones.forehead;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath();
          ctx.ellipse(f.x, f.y + i * f.ry * 0.55 + f.rx * 1.2, f.rx * 0.8, f.rx * 1.2, 0, Math.PI * 1.36, Math.PI * 1.64);
          ctx.stroke();
        }
        // Crow's feet at the outer eye corners
        for (const [e, dir] of [[zones.leftEye, -1], [zones.rightEye, 1]] as const) {
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(e.x + dir * e.rx * 0.2, e.y + i * e.ry * 0.3);
            ctx.lineTo(e.x + dir * e.rx * 1.3, e.y + i * e.ry * 0.9);
            ctx.stroke();
          }
        }
        ctx.restore();
        break;
      }
    }
  }
}
