// POST /api/skin/simulate  { image: "data:image/jpeg;base64,...", intensities: { texture: 0.4, ... } }  ->  { taskId }
// GET  /api/skin/simulate?id=TASK_ID  ->  { status: "running" | "success" | "error", image?, error? }
// YouCam AI Skin Simulation: shows how the skin could look once the chosen products address each concern.
import { isMockSkin, pollSkinSimulation, SIM_KEYS, startSkinSimulation, YouCamError, type SimKey } from "@/lib/server/youcam";

// Vercel: allow slow upstream calls (YouCam upload, Claude web search).
export const maxDuration = 60;

const fail = (e: unknown, where: string) => {
  const err = e as YouCamError;
  console.error(where, err.status, err.code, err.message);
  return Response.json({ error: err.message || "Skin simulation failed." }, { status: err.status ?? 500 });
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const m = /^data:(image\/(?:jpeg|jpg|png));base64,(.+)$/.exec(String(body.image || ""));
    if (!m) return Response.json({ error: "Please send a JPG or PNG photo." }, { status: 400 });
    const raw = (body.intensities ?? {}) as Record<string, unknown>;
    const intensities: Partial<Record<SimKey, number>> = {};
    for (const k of SIM_KEYS) if (typeof raw[k] === "number" && Number.isFinite(raw[k])) intensities[k] = Math.min(1, Math.max(0, raw[k] as number));
    if (!Object.values(intensities).some((v) => (v ?? 0) > 0)) return Response.json({ error: "Nothing to simulate." }, { status: 400 });
    // Demo mode: no YouCam call, the photo comes back unchanged and is labelled as a demo.
    if (isMockSkin()) return Response.json({ status: "success", image: body.image, mock: true });
    const type = m[1] === "image/png" ? "image/png" : "image/jpeg";
    return Response.json({ taskId: await startSkinSimulation(Buffer.from(m[2], "base64"), type, intensities) });
  } catch (e) {
    return fail(e, "skin/simulate");
  }
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  try {
    return Response.json(await pollSkinSimulation(id));
  } catch (e) {
    return fail(e, "skin/simulate status");
  }
}
