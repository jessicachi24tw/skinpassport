"use client";
// Lazy-loaded MediaPipe Face Landmarker (478 3D face points, runs fully in the browser).
// Prefers self-hosted files (npm run setup:assets) and falls back to the public CDNs.
// If nothing loads, callers fall back to a purely decorative scan animation.

import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";

const VERSION = "1.2.0";
const LOCAL_WASM = "/mediapipe/wasm";
const CDN_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const LOCAL_MODEL = "/models/face_landmarker.task";
const CDN_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export type Landmarks = NormalizedLandmark[];
export interface Mesh {
  landmarker: FaceLandmarker;
  tessellation: { start: number; end: number }[];
  oval: { start: number; end: number }[];
}

let loading: Promise<Mesh | null> | null = null;

async function reachable(url: string) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * MediaPipe prints its own start-up notes ("INFO: Created TensorFlow Lite XNNPACK delegate…",
 * "W1101 … OpenGL error checking is disabled") through console.error. They are not errors,
 * but the Next.js dev server shows them as red stack traces, so drop just those lines.
 */
function quietMediaPipeLogs() {
  if (typeof window === "undefined" || (window as { __mpQuiet?: boolean }).__mpQuiet) return;
  (window as { __mpQuiet?: boolean }).__mpQuiet = true;
  const noise = /^(INFO: |[IW]\d{4} \d{2}:\d{2}:\d{2}\.\d+ )/;
  for (const level of ["error", "warn", "log", "info"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      if (typeof args[0] === "string" && noise.test(args[0])) return;
      original(...args);
    };
  }
}

async function load(): Promise<Mesh | null> {
  quietMediaPipeLogs();
  try {
    const vision = await import("@mediapipe/tasks-vision");
    const wasmBase = (await reachable(`${LOCAL_WASM}/vision_wasm_internal.wasm`)) ? LOCAL_WASM : CDN_WASM;
    const model = (await reachable(LOCAL_MODEL)) ? LOCAL_MODEL : CDN_MODEL;
    const fileset = await vision.FilesetResolver.forVisionTasks(wasmBase);
    const make = (delegate: "GPU" | "CPU") =>
      vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: model, delegate },
        runningMode: "VIDEO",
        numFaces: 1,
      });
    let landmarker: FaceLandmarker;
    try {
      landmarker = await make("GPU");
    } catch {
      landmarker = await make("CPU");
    }
    return {
      landmarker,
      tessellation: vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION,
      oval: vision.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
    };
  } catch (e) {
    console.warn("Face mesh unavailable, using the simple scan animation.", e);
    return null;
  }
}

/** Load once per page; later calls reuse the same instance. */
export function getFaceMesh() {
  if (!loading) loading = load();
  return loading;
}

let lastTs = 0;
/** VIDEO mode needs strictly increasing timestamps, even for still images. */
export function detect(mesh: Mesh, source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Landmarks | null {
  const ts = Math.max(performance.now(), lastTs + 1);
  lastTs = ts;
  try {
    return mesh.landmarker.detectForVideo(source, ts).faceLandmarks[0] ?? null;
  } catch {
    return null;
  }
}

/** Is the face centred and at a good distance? Coordinates are 0–1 of the frame. */
export function alignment(lm: Landmarks) {
  let minX = 1,
    maxX = 0,
    minY = 1,
    maxY = 0;
  for (const p of lm) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const w = maxX - minX;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // Coordinates are in the portrait 3:4 viewfinder; the guide oval is about 2/3 of its width.
  if (w < 0.42) return { ok: false, hint: "Move closer" };
  if (w > 0.86) return { ok: false, hint: "Move back a little" };
  if (Math.abs(cx - 0.5) > 0.09 || Math.abs(cy - 0.47) > 0.09) return { ok: false, hint: "Center your face in the oval" };
  return { ok: true, hint: "Hold still" };
}
