import "server-only";
// YouCam AI Skin Analysis client (server side only — the API key never reaches the browser).
// Flow: 1) register file  2) PUT bytes to the presigned URL  3) create task  4) poll task.

import type { SkinProfile, SkinScores } from "../types";

const BASE = process.env.YOUCAM_API_BASE || "https://yce-api-01.makeupar.com";

/** SD concerns we request. SD and HD concerns cannot be mixed in one task. */
export const ACTIONS = ["moisture", "oiliness", "redness", "age_spot", "acne", "pore", "texture", "radiance"] as const;

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

/** Steps 1–3. Returns the task id to poll. */
export async function startSkinAnalysis(bytes: Buffer, contentType: "image/jpeg" | "image/png") {
  if (bytes.length >= 10 * 1024 * 1024) throw new YouCamError(friendly("exceed_max_filesize"), 400);
  const fileRes = await youcam("/s2s/v2.0/file/skin-analysis", {
    method: "POST",
    body: JSON.stringify({
      files: [{ content_type: contentType, file_name: contentType === "image/png" ? "selfie.png" : "selfie.jpg", file_size: bytes.length }],
    }),
  });
  type FileInfo = { file_id: string | number; requests: { url: string; method?: string; headers?: Record<string, string | number> }[] };
  const file = (fileRes.data as { files: FileInfo[] }).files[0];
  const upload = file.requests[0];
  const headers = Object.fromEntries(Object.entries(upload.headers || { "Content-Type": contentType }).map(([k, v]) => [k, String(v)]));
  const put = await fetch(upload.url, { method: upload.method || "PUT", headers, body: new Uint8Array(bytes), signal: AbortSignal.timeout(25000) });
  if (!put.ok) throw new YouCamError(`Photo upload failed (HTTP ${put.status}).`, 502);

  const task = await youcam("/s2s/v2.0/task/skin-analysis", {
    method: "POST",
    body: JSON.stringify({ src_file_id: String(file.file_id), dst_actions: ACTIONS, format: "json" }),
  });
  return String((task.data as { task_id: string | number }).task_id);
}

type Output = { type: string; ui_score?: number; score?: number };

/** Convert YouCam's result list into our SkinProfile. */
export function normalizeResult(results: { output?: Output[] } | undefined): SkinProfile {
  const scores: Partial<SkinScores> = {};
  let overall: number | null = null;
  let skinAge: number | null = null;
  for (const item of results?.output ?? []) {
    if (item.type === "all" && typeof item.score === "number") overall = Math.round(item.score);
    else if (item.type === "skin_age" && typeof item.score === "number") skinAge = Math.round(item.score);
    else if ((ACTIONS as readonly string[]).includes(item.type) && typeof item.ui_score === "number") {
      scores[item.type as keyof SkinScores] = item.ui_score;
    }
  }
  return {
    source: "youcam",
    label: "Your YouCam skin scan",
    overall,
    skinAge,
    // Neutral fallback (60) if YouCam skipped a concern.
    scores: { moisture: 60, oiliness: 60, redness: 60, age_spot: 60, ...scores },
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
