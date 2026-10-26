// GET /api/skin/status?id=TASK_ID  ->  { status: "running" | "success" | "error", skin?, error? }
import { pollSkinAnalysis, YouCamError } from "@/lib/server/youcam";

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  try {
    return Response.json(await pollSkinAnalysis(id));
  } catch (e) {
    const err = e as YouCamError;
    console.error("skin/status", err.status, err.code, err.message);
    return Response.json({ error: err.message }, { status: err.status ?? 500 });
  }
}
