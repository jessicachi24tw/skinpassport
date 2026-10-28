#!/usr/bin/env node
// One-time asset setup. Run it from your own terminal (it needs internet):
//
//   npm run setup:assets                    # everything
//   npm run setup:assets -- --only=cerave-cream,aquaphor-lip
//   npm run setup:assets -- --force         # re-download images that already exist
//   npm run setup:assets -- --skip-images   # only the face-scan model + wasm
//
// What it does
// 1. Copies the MediaPipe wasm runtime from node_modules to public/mediapipe/wasm
// 2. Downloads the MediaPipe Face Landmarker model to public/models
// 3. For every catalog product: finds a front photo on Open Beauty Facts,
//    removes the background, trims and centres it, and saves
//    public/products/<id>.png
// 4. Writes src/lib/shop/product-images.json and docs/IMAGE_CREDITS.md
//
// Open Beauty Facts photos are CC BY-SA 3.0. The cut-outs are derivatives and
// are shared under the same license; credits are written to docs/IMAGE_CREDITS.md.

import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const ONLY = typeof args.only === "string" ? new Set(args.only.split(",")) : null;
const UA = "SkinPassport/0.2 (hackathon demo; https://github.com/)";
const OBF = "https://world.openbeautyfacts.org";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function getBuffer(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// ---------- 1 + 2. Face-scan runtime ----------
async function setupFaceScan() {
  const src = path.join(ROOT, "node_modules/@mediapipe/tasks-vision/wasm");
  const dst = path.join(ROOT, "public/mediapipe/wasm");
  await mkdir(dst, { recursive: true });
  for (const f of await readdir(src)) {
    if (f.startsWith("vision_wasm_internal") || f.startsWith("vision_wasm_nosimd_internal")) await copyFile(path.join(src, f), path.join(dst, f));
  }
  log("✓ MediaPipe wasm copied to public/mediapipe/wasm");

  const model = path.join(ROOT, "public/models/face_landmarker.task");
  if ((await exists(model)) && !args.force) {
    log("✓ Face Landmarker model already present");
    return;
  }
  await mkdir(path.dirname(model), { recursive: true });
  log("↓ Downloading Face Landmarker model…");
  await writeFile(model, await getBuffer(MODEL_URL));
  log("✓ Saved public/models/face_landmarker.task");
}

// ---------- 3. Product photos ----------
const words = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9+% ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

/** How well an Open Beauty Facts result matches our product. */
function matchScore(seed, hit) {
  const brandOk = words(seed.brand).some((w) => words(`${hit.brands ?? ""} ${hit.product_name ?? ""}`).includes(w));
  if (!brandOk) return -1;
  const want = new Set(words(seed.obf));
  const got = new Set(words(`${hit.product_name ?? ""} ${hit.brands ?? ""}`));
  let overlap = 0;
  for (const w of want) if (got.has(w)) overlap++;
  return overlap / want.size + (hit.image_front_url ? 0.2 : -1);
}

async function findOnObf(seed, overrides) {
  const pinned = overrides[seed.id];
  if (pinned) {
    const d = await getJson(`${OBF}/api/v2/product/${pinned}?fields=code,product_name,brands,image_front_url`);
    return d.product ? { ...d.product, code: d.code ?? pinned } : null;
  }
  const q = new URLSearchParams({
    search_terms: seed.obf,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "20",
    fields: "code,product_name,brands,image_front_url",
  });
  const d = await getJson(`${OBF}/cgi/search.pl?${q}`);
  const ranked = (d.products ?? [])
    .map((h) => ({ h, s: matchScore(seed, h) }))
    .filter((x) => x.s > 0.35)
    .sort((a, b) => b.s - a.s);
  return ranked[0]?.h ?? null;
}

/** Cut out the product, trim, and centre it on a transparent square canvas. */
async function cutOut(buffer, removeBackground, sharp) {
  const input = await sharp(buffer).rotate().resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const blob = await removeBackground(new Blob([input], { type: "image/png" }), { output: { format: "image/png" } });
  const cut = Buffer.from(await blob.arrayBuffer());
  const trimmed = await sharp(cut).trim({ threshold: 1 }).toBuffer();
  const SIZE = 800;
  const PAD = 70;
  const fitted = await sharp(trimmed)
    .resize({ width: SIZE - PAD * 2, height: SIZE - PAD * 2, fit: "inside" })
    .toBuffer();
  return sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fitted, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function loadSeeds() {
  // The catalog is TypeScript; read the seed entries out of it without a TS toolchain.
  const src = await readFile(path.join(ROOT, "src/lib/shop/catalog.ts"), "utf8");
  const seeds = [];
  const re = /\{\s*id: "([^"]+)", brand: "([^"]+)", name: "([^"]+)"[\s\S]*?obf: "([^"]+)",\s*\}/g;
  let m;
  while ((m = re.exec(src))) seeds.push({ id: m[1], brand: m[2], name: m[3], obf: m[4] });
  return seeds;
}

async function setupImages() {
  let removeBackground;
  let sharp;
  try {
    ({ removeBackground } = await import("@imgly/background-removal-node"));
    sharp = (await import("sharp")).default;
  } catch {
    console.error("✗ Background remover not installed. Run: npm run setup:assets (it installs it first).");
    process.exit(1);
  }

  const seeds = (await loadSeeds()).filter((s) => !ONLY || ONLY.has(s.id));
  const manifestPath = path.join(ROOT, "src/lib/shop/product-images.json");
  const manifest = existsSync(manifestPath) ? JSON.parse(await readFile(manifestPath, "utf8")) : {};
  const overridesPath = path.join(ROOT, "scripts/obf-overrides.json");
  const overrides = existsSync(overridesPath) ? JSON.parse(await readFile(overridesPath, "utf8")) : {};
  const outDir = path.join(ROOT, "public/products");
  const cacheDir = path.join(ROOT, ".asset-cache");
  await mkdir(outDir, { recursive: true });
  await mkdir(cacheDir, { recursive: true });

  const missing = [];
  for (const [i, seed] of seeds.entries()) {
    const out = path.join(outDir, `${seed.id}.png`);
    const tag = `[${i + 1}/${seeds.length}] ${seed.brand} — ${seed.name}`;
    if (!args.force && manifest[seed.id] && (await exists(out))) {
      log(`· ${tag} (already done)`);
      continue;
    }
    try {
      const hit = await findOnObf(seed, overrides);
      // Open Beauty Facts asks for ≤10 searches per minute.
      await sleep(6500);
      if (!hit?.image_front_url) {
        missing.push(seed);
        log(`✗ ${tag}: no photo found on Open Beauty Facts`);
        continue;
      }
      const fullUrl = hit.image_front_url.replace(/\.\d+\.jpg$/, ".full.jpg");
      let raw;
      try {
        raw = await getBuffer(fullUrl);
      } catch {
        raw = await getBuffer(hit.image_front_url);
      }
      await writeFile(path.join(cacheDir, `${seed.id}.jpg`), raw);
      await writeFile(out, await cutOut(raw, removeBackground, sharp));
      manifest[seed.id] = {
        src: `/products/${seed.id}.png`,
        code: String(hit.code),
        sourceUrl: `${OBF}/product/${hit.code}`,
        matchedName: `${hit.brands ?? ""} ${hit.product_name ?? ""}`.trim(),
      };
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
      log(`✓ ${tag}\n    matched: ${manifest[seed.id].matchedName} (${hit.code})`);
    } catch (e) {
      missing.push(seed);
      log(`✗ ${tag}: ${e.message}`);
    }
  }

  // Credits
  const all = await loadSeeds();
  const rows = all
    .filter((s) => manifest[s.id])
    .map((s) => `| ${s.brand} — ${s.name} | [${manifest[s.id].code}](${manifest[s.id].sourceUrl}) |`)
    .join("\n");
  await writeFile(
    path.join(ROOT, "docs/IMAGE_CREDITS.md"),
    `# Product image credits

Product photos come from [Open Beauty Facts](${OBF}) and are licensed under
[Creative Commons Attribution-ShareAlike 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
by Open Beauty Facts contributors. We removed the backgrounds and re-framed the photos;
the edited images in \`public/products/\` are shared under the same CC BY-SA 3.0 license.
Brand names and packaging belong to their owners and are shown only to identify the products.

| Product | Open Beauty Facts source |
|---|---|
${rows}
`,
  );

  log(`\nDone: ${Object.keys(manifest).length} product images. Credits written to docs/IMAGE_CREDITS.md`);
  if (missing.length) {
    log(`\nNo photo for ${missing.length} product(s). They will keep the illustrated pack shot:`);
    for (const s of missing) log(`  - ${s.id}  (search: "${s.obf}")`);
    log(`To fix one, find it on ${OBF}, then add its barcode to scripts/obf-overrides.json, e.g. { "${missing[0].id}": "1234567890123" }, and run:\n  npm run setup:assets -- --only=${missing[0].id}`);
  }
}

// ---------- run ----------
try {
  await setupFaceScan();
} catch (e) {
  log(`! Face-scan model step failed (${e.message}). The app will load it from Google's CDN instead.`);
}
if (!args["skip-images"]) await setupImages();
