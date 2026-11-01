import "server-only";
// YouCam client (server side only: the API key never reaches the browser).
// AI Skin Analysis:   1) register file  2) PUT bytes to the presigned URL  3) create task  4) poll task.
// AI Skin Simulation: same steps on the skin-simulation endpoints; the result is an image URL.

import { SKIN_TYPE_LABELS } from "../engine/skinType";
import type { SkinProfile, SkinScores, SkinType, SkinTypeLabel } from "../types";

const BASE = process.env.YOUCAM_API_BASE || "https://yce-api-01.makeupar.com";

/**
 * The 9 SD concerns a trip can change and our products can address, plus skin type.
 * (Firmness, the eye area and eyelid shape are left out on purpose: the plan has no
 * product for them.) SD and HD concerns cannot be mixed.
 */
export const ACTIONS = ["moisture", "oiliness", "redness", "age_spot", "acne", "pore", "texture", "radiance", "wrinkle", "skin_type"] as const;
/** Used only if YouCam rejects skin_type for this account. */
const BASIC_ACTIONS = ["moisture", "oiliness", "redness", "age_spot", "acne", "pore", "texture", "radiance", "wrinkle"];

/** YouCam output type → our score key. */
const SCORE_KEY: Record<string, keyof SkinScores> = {
  moisture: "moisture",
  oiliness: "oiliness",
  redness: "redness",
  age_spot: "age_spot",
  acne: "acne",
  pore: "pore",
  texture: "texture",
  radiance: "radiance",
  wrinkle: "wrinkle",
};
const SKIN_TYPES = SKIN_TYPE_LABELS;

export const isMockSkin = () => process.env.MOCK_YOUCAM === "1" || !process.env.YOUCAM_API_KEY;

const FRIENDLY: Record<string, string> = {
  error_src_face_too_small: "Your face looks too small. Move closer so it fills most of the photo.",
  error_src_face_out_of_bound: "Part of your face is outside the photo. Centre your face and try again.",
  error_lighting_dark: "The photo is too dark. Face a window or a bright light.",
  error_below_min_image_size: "The photo is too small. Use at least 480px on the short side.",
  error_no_face: "No face found. Take a clear, front-facing selfie.",
  error_multiple_people: "More than one person found. Only you should be in the photo.",
  error_large_face_angle: "Your head is turned too much. Look straight at the camera.",
  exceed_max_filesize: "The photo file is too big (max 10 MB).",
  error_decode_image: "Could not read that image. Use a JPG or PNG.",
  error_exceed_max_image_size: "The photo is too large. Use at most 2560px on the long side.",
  error_invalid_params: "The request was not accepted by YouCam.",
};
export const friendly = (code?: string) => (code && FRIENDLY[code]) || `Skin analysis failed (${code || "unknown error"}). Try another photo.`;

/** Wrap 16+ digit integers in quotes so IDs keep their precision in JavaScript. */
const safeJson = (text: string) => JSON.parse(text.replace(/([:\[,]\s*)(-?\d{16,})(?=\s*[,\]}])/g, '$1"$2"'));

export class YouCamError extends Error {
  constructor(message: string, public status = 500, public code?: string) {
    super(message);
  }
}

async function youcam(path: string, init: RequestInit = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(BASE + path, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${process.env.YOUCAM_API_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
    });
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = safeJson(text);
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      const code = (data.error_code || data.error) as string | undefined;
      throw new YouCamError(friendly(code), res.status === 400 ? 400 : 502, code);
    }
    return data as { data?: Record<string, unknown> } & Record<string, unknown>;
  }
  throw new YouCamError("YouCam is busy right now. Please wait a minute and retry.", 429);
}

/** Steps 1–2: register the photo for a feature and upload it. Returns the file id. */
async function uploadPhoto(feature: "skin-analysis" | "skin-simulation", bytes: Buffer, contentType: "image/jpeg" | "image/png") {
  if (bytes.length >= 10 * 1024 * 1024) throw new YouCamError(friendly("exceed_max_filesize"), 400);
  const body = JSON.stringify({
    files: [{ content_type: contentType, file_name: contentType === "image/png" ? "selfie.png" : "selfie.jpg", file_size: bytes.length }],
  });
  let fileRes;
  try {
    fileRes = await youcam(`/s2s/v2.0/file/${feature}`, { method: "POST", body });
  } catch (e) {
    // Some features use the generic upload endpoint.
    if ((e as YouCamError).status === 400) throw e;
    fileRes = await youcam("/s2s/v2.0/file", { method: "POST", body });
  }
  type FileInfo = { file_id: string | number; requests: { url: string; method?: string; headers?: Record<string, string | number> }[] };
  const file = (fileRes.data as { files: FileInfo[] }).files[0];
  const upload = file.requests[0];
  const headers = Object.fromEntries(Object.entries(upload.headers || { "Content-Type": contentType }).map(([k, v]) => [k, String(v)]));
  const put = await fetch(upload.url, { method: upload.method || "PUT", headers, body: new Uint8Array(bytes), signal: AbortSignal.timeout(25000) });
  if (!put.ok) throw new YouCamError(`Photo upload failed (HTTP ${put.status}).`, 502);
  return String(file.file_id);
}

/** Steps 1–3. Returns the task id to poll. */
export async function startSkinAnalysis(bytes: Buffer, contentType: "image/jpeg" | "image/png") {
  const fileId = await uploadPhoto("skin-analysis", bytes, contentType);
  const run = (actions: readonly string[]) =>
    youcam("/s2s/v2.0/task/skin-analysis", { method: "POST", body: JSON.stringify({ src_file_id: fileId, dst_actions: actions, format: "json" }) });
  let task;
  try {
    task = await run(ACTIONS);
  } catch (e) {
    // If the account doesn't accept skin_type, fall back to the 8 scores.
    if ((e as YouCamError).status !== 400 || !/invalid/i.test(String((e as YouCamError).code ?? e))) throw e;
    console.warn("YouCam rejected the concern list, retrying without skin_type.");
    task = await run(BASIC_ACTIONS);
  }
  return String((task.data as { task_id: string | number }).task_id);
}

type Output = { type: string; ui_score?: number; score?: number; mask_urls?: string[] } & Record<string, unknown>;

/** Find a skin-type label anywhere inside part of YouCam's skin_type item (its exact shape isn't documented). */
function findSkinType(x: unknown, depth = 0): SkinTypeLabel | null {
  if (depth > 4 || x == null) return null;
  if (typeof x === "string") {
    // Accept "Combination & Redness", "combination_redness", "COMBINATION AND REDNESS", "oily"…
    if (/^https?:/.test(x) || x.length > 40) return null; // mask URLs and long text are not labels
    const w = x.toLowerCase();
    const base = ["combination", "normal", "oily", "dry"].find((b) => new RegExp(`\\b${b}\\b`).test(w.replace(/[_-]/g, " ")));
    const red = /redness|sensitive/.test(w);
    const label = base ? `${base[0].toUpperCase()}${base.slice(1)}${red && base !== "normal" ? " & Redness" : ""}` : red ? "Redness" : null;
    return SKIN_TYPES.find((t) => t === label) ?? null;
  }
  if (typeof x === "object") {
    const o = x as Record<string, unknown>;
    // Prefer the whole-face result.
    if (o.whole !== undefined) {
      const w = findSkinType(o.whole, depth + 1);
      if (w) return w;
    }
    for (const [k, v] of Object.entries(o)) {
      if (k === "type") continue;
      const r = findSkinType(v, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

/** Whole face + T-zone + U-zone. */
export function parseSkinType(item: Record<string, unknown>): SkinType | null {
  const zoned = item.whole !== undefined || item.t_zone !== undefined || item.u_zone !== undefined;
  const whole = zoned ? findSkinType(item.whole) : findSkinType(Object.fromEntries(Object.entries(item).filter(([k]) => k !== "type")));
  const t: SkinType = { whole, tZone: zoned ? findSkinType(item.t_zone) : null, uZone: zoned ? findSkinType(item.u_zone) : null };
  return t.whole || t.tZone || t.uZone ? { ...t, whole: t.whole ?? t.uZone ?? t.tZone ?? null } : null;
}

/** Convert YouCam's result list into our SkinProfile. */
export function normalizeResult(results: { output?: Output[] } | undefined): SkinProfile {
  const scores: Partial<SkinScores> = {};
  const masks: SkinProfile["masks"] = {};
  let overall: number | null = null;
  let skinAge: number | null = null;
  let skinType: SkinType | null = null;
  for (const item of results?.output ?? []) {
    const key = SCORE_KEY[item.type];
    if (item.type === "all" && typeof item.score === "number") overall = Math.round(item.score);
    else if (item.type === "skin_age" && typeof item.score === "number") skinAge = Math.round(item.score);
    else if (item.type === "skin_type") skinType = parseSkinType(item);
    else if (key && typeof item.ui_score === "number") {
      scores[key] = item.ui_score;
      const mask = item.mask_urls?.[0];
      if (mask) masks[key] = mask;
    }
  }
  return {
    source: "youcam",
    label: "Your YouCam skin scan",
    overall,
    skinAge,
    skinType,
    // Neutral fallback (60) if YouCam skipped a concern.
    scores: { moisture: 60, oiliness: 60, redness: 60, age_spot: 60, ...scores },
    masks,
  };
}

/** Step 4. */
export async function pollSkinAnalysis(taskId: string): Promise<{ status: "running" } | { status: "success"; skin: SkinProfile } | { status: "error"; error: string }> {
  const r = await youcam(`/s2s/v2.0/task/skin-analysis/${encodeURIComponent(taskId)}`, { method: "GET" });
  const d = (r.data || {}) as { task_status?: string; results?: { output?: Output[] }; error?: string; error_code?: string };
  if (d.task_status === "success") return { status: "success", skin: normalizeResult(d.results) };
  if (d.task_status === "error") return { status: "error", error: friendly(d.error || d.error_code) };
  return { status: "running" };
}

// ---------------- AI Skin Simulation ----------------

/** The 10 concerns AI Skin Simulation can improve (intensity 0 = unchanged, 1 = strongest). */
export const SIM_KEYS = ["wrinkle", "radiance", "oiliness", "acne", "eye_bags", "dark_circle", "spots", "pores", "texture", "redness"] as const;
export type SimKey = (typeof SIM_KEYS)[number];

export async function startSkinSimulation(bytes: Buffer, contentType: "image/jpeg" | "image/png", intensities: Partial<Record<SimKey, number>>) {
  const params = Object.fromEntries(
    SIM_KEYS.map((k) => [k, Math.round(Math.min(1, Math.max(0, intensities[k] ?? 0)) * 100) / 100]).filter(([, v]) => (v as number) > 0),
  );
  if (!Object.keys(params).length) throw new YouCamError("Nothing to simulate yet: add products to your bag first.", 400);
  const fileId = await uploadPhoto("skin-simulation", bytes, contentType);
  const task = await youcam("/s2s/v2.0/task/skin-simulation", { method: "POST", body: JSON.stringify({ src_file_id: fileId, ...params }) });
  return String((task.data as { task_id: string | number }).task_id);
}

/** First http(s) URL found in the task result (its nesting isn't fixed in the docs). */
function findUrl(x: unknown, depth = 0): string | null {
  if (depth > 5 || x == null) return null;
  if (typeof x === "string") return /^https?:\/\//.test(x) ? x : null;
  if (Array.isArray(x)) {
    for (const v of x) {
      const r = findUrl(v, depth + 1);
      if (r) return r;
    }
    return null;
  }
  if (typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (typeof o.url === "string") return o.url;
    for (const v of Object.values(o)) {
      const r = findUrl(v, depth + 1);
      if (r) return r;
    }
  }
  return null;
}

/** Poll the simulation. On success the image is downloaded here and returned as a data URL (the YouCam URL expires in 2 h). */
export async function pollSkinSimulation(taskId: string): Promise<{ status: "running" } | { status: "success"; image: string } | { status: "error"; error: string }> {
  const r = await youcam(`/s2s/v2.0/task/skin-simulation/${encodeURIComponent(taskId)}`, { method: "GET" });
  const d = (r.data || {}) as { task_status?: string; results?: unknown; error?: string; error_code?: string };
  if (d.task_status === "error") return { status: "error", error: friendly(d.error || d.error_code) };
  if (d.task_status !== "success") return { status: "running" };
  const url = findUrl(d.results) ?? findUrl(r.data) ?? findUrl(r);
  if (!url) return { status: "error", error: "YouCam finished but returned no image." };
  const img = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!img.ok) return { status: "error", error: `Could not download the simulated image (HTTP ${img.status}).` };
  const type = img.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  return { status: "success", image: `data:${type};base64,${Buffer.from(await img.arrayBuffer()).toString("base64")}` };
}
