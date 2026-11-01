"use client";
// AI Skin Simulation needs the face to fill at least 60% of the image width.
// Selfies usually show more background, so we crop a square around the face
// (found with the in-browser MediaPipe face mesh) before sending it.

import { detect, getFaceMesh } from "./faceMesh";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/** Returns a JPEG data URL cropped around the face, or the original photo if no face is found. */
export async function cropToFace(photo: string, faceShare = 0.72): Promise<string> {
  try {
    const img = await loadImage(photo);
    const mesh = await getFaceMesh();
    const lm = mesh ? detect(mesh, img) : null;
    if (!lm) return photo;
    const xs = lm.map((p) => p.x * img.naturalWidth);
    const ys = lm.map((p) => p.y * img.naturalHeight);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const faceW = x1 - x0;
    const side = Math.min(img.naturalWidth, img.naturalHeight, Math.max(faceW / faceShare, (y1 - y0) * 1.15));
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const sx = Math.max(0, Math.min(img.naturalWidth - side, cx - side / 2));
    const sy = Math.max(0, Math.min(img.naturalHeight - side, cy - side / 2));
    // YouCam needs at least 480 px on the short side; keep it at most 1024 px.
    const out = Math.round(Math.min(1024, Math.max(512, side)));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = out;
    canvas.getContext("2d")!.drawImage(img, sx, sy, side, side, 0, 0, out, out);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return photo;
  }
}
