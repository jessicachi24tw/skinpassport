// POST /api/skin/analyze  { image: "data:image/jpeg;base64,...", demo?: boolean }
// Returns { status: "success", skin } in demo/mock mode, otherwise { taskId } to poll.
import { DEMO_SKIN } from "@/lib/engine/scenarios";
import { isMockSkin, startSkinAnalysis, YouCamError } from "@/lib/server/youcam";

// Vercel: allow slow upstream calls (YouCam upload, Claude web search).
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.demo === true || isMockSkin()) {
      return Response.json({ status: "success", skin: DEMO_SKIN, mock: true });
    }
    const m = /^data:(image\/(?:jpeg|jpg|png));base64,(.+)$/.exec(String(body.image || ""));
    if (!m) return Response.json({ error: "Please send a JPG or PNG photo." }, { status: 400 });
    const type = m[1] === "image/png" ? "image/png" : "image/jpeg";
    const taskId = await startSkinAnalysis(Buffer.from(m[2], "base64"), type);
    return Response.json({ taskId });
  } catch (e) {
    const err = e as YouCamError;
    console.error("skin/analyze", err.status, err.code, err.message);
    return Response.json({ error: err.message || "Skin analysis failed." }, { status: err.status ?? 500 });
  }
}
