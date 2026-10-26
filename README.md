# SkinPassport — Geo-Adaptive Skincare Coach

**Your skin today + your destination's climate = the right travel kit.**

SkinPassport scans your skin with the **YouCam AI Skin Analysis API**, pulls the weather forecast for your trip (temperature, humidity, UV index, air quality), and turns both into:

- a **pre-trip routine** for the days before you leave ("your skin is dry — hydration boost this week"),
- a **Necessity Score (0–100)** and star rating for every product category,
- an **Essential kit** (must-pack only) and a **Complete kit**, each with a Buy now link and an estimated cart total.

> Demo highlight: the same dry-skin scan produces a completely different cart for **New York in winter** (ceramide barrier cream, hydrating serum, lip repair, SPF 30) and **Miami in July** (SPF 60 water-resistant sunscreen, after-sun gel, a light gel moisturizer instead of rich cream).

![Architecture](docs/architecture.png)

| New York, dry winter | Miami, high UV |
|---|---|
| ![New York result](docs/screenshot-nyc.png) | ![Miami result](docs/screenshot-miami.png) |

---

## How it works

1. **Skin scan** — the browser resizes the selfie and sends it to `/api/skin/analyze`. The server registers the file with YouCam (`POST /s2s/v2.0/file/skin-analysis`), uploads the bytes to the presigned URL, starts a task (`POST /s2s/v2.0/task/skin-analysis`) and the browser polls `/api/skin/status` until the task succeeds. We use the SD concerns `moisture, oiliness, redness, age_spot, acne, pore, texture, radiance` (scores 1–100, higher = healthier).
2. **Trip** — type it naturally ("Ski trip to Hokkaido next week for 4 days") or fill in the form. `/api/trip/parse` uses Claude when configured, with a keyword fallback. `/api/weather` geocodes the destination and summarises the forecast for the trip dates.
3. **Advice engine** (`src/lib/engine/necessity.ts`) — a transparent rule engine converts skin scores into concern levels (dryness, oil, sensitivity, spots) and the climate into stress factors (UV with snow/water reflection, dry air, humidity, cold, heat, pollution). Each category gets a Necessity Score and a tier:

   | Score | Tier | Kit |
   |---|---|---|
   | 70–100 | Must-pack | Essential + Complete |
   | 50–69 | Recommended | Complete |
   | 35–49 | Nice to have | Complete |
   | < 35 | Skip | — |

   The sunscreen spec is derived from effective UV: SPF 50+ / PA++++ when UV ≥ 8, water-resistant for beach, ski and outdoor trips.
4. **Shop provider** (`src/lib/shop/`) — picks the best-fitting product per category (SPF requirement, water resistance, sensitive-skin friendly, price). The MVP uses a curated catalog with retailer links; the `ShopProvider` interface lets you swap in a real store API. See [docs/shop-api-survey.md](docs/shop-api-survey.md).
5. **Coach note** — Claude writes a 2–3 sentence explanation from the engine's output. The LLM never decides what to recommend, so results are stable and explainable.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4, mobile-first |
| Backend | Next.js Route Handlers (`src/app/api/*`) — all API keys stay on the server |
| Skin AI | YouCam AI Skin Analysis API |
| Weather | Open-Meteo (default, no key) or OpenWeather |
| LLM | Anthropic Claude (optional) |
| Tests | Vitest (`src/lib/engine/__tests__`) |

## Project structure

```
src/
  app/
    page.tsx                 # mobile UI (3 steps)
    api/skin/analyze         # YouCam: upload + create task
    api/skin/status          # YouCam: poll task
    api/weather              # forecast or demo scenario
    api/trip/parse           # free-text trip -> structured trip
    api/plan                 # engine + kits + coach note
    api/health               # which integrations are live
  components/                # SkinStep, TripStep, Results, ui
  lib/
    engine/                  # necessity.ts, kits.ts, scenarios.ts (pure, tested)
    server/                  # youcam.ts, weather.ts, llm.ts (server-only)
    shop/                    # catalog.ts, provider.ts
docs/                        # architecture, screenshots, shop API survey
```

## Run it locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local   # add YOUCAM_API_KEY (others optional)
npm run dev                  # http://localhost:3000
npm test                     # engine unit tests
```

Every integration has a fallback, so the app runs with **no keys at all**: demo skin scan, Open-Meteo weather, template coach note. Set `MOCK_YOUCAM=1` to film the demo without spending YouCam units.

## Limitations and next steps

- Product prices are estimates; the next step is a live Shop API (Shopify Storefront or Amazon Creators API).
- Forecasts reach 16 days ahead (5 days with OpenWeather); later trips should use climate averages.
- Calendar sync (Google Calendar) to detect upcoming trips automatically.
- YouCam Virtual Try-On for the recommended products.

Not medical advice.
