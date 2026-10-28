# SkinPassport — Geo-Adaptive Skincare Coach

**Your trip + your skin today = the right travel kit.**

SkinPassport plans your trip, scans your skin with the **YouCam AI Skin Analysis API**, checks what's already on your shelf, and pulls the weather for your exact dates (temperature, humidity, UV index, air quality). It turns all of that into:

- an **InBody-style skin report**: each score in grey reference zones (Weak · Normal · Strong) plus a **trip risk** for your destination,
- a **Necessity Score (0–100)** with a Must-pack / Recommended / Nice-to-have tag for every product category,
- product picks from a **L'Oréal Groupe-first catalog** in three budgets, each explained through its **verified ingredients** ("Your Moisture is Weak (32) → contains Ceramides, which rebuild the skin barrier"),
- an **action plan** (Before the trip · During the trip · Shopping list) that adapts to how many days are left and can be **saved as an image** to your phone.

> Demo highlight: the same dry-skin scan produces a completely different plan for **New York in winter** (ceramide cream, hydrating serum, lip repair, SPF 30) and **Miami in July** (SPF 50+ water-resistant sunscreen, after-sun gel, a light gel moisturizer instead of rich cream).

![Architecture](docs/architecture.png)

| Skin report + trip risk | Ingredient-based picks | Action plan (saved image) | Product page |
|---|---|---|---|
| ![Skin report](docs/screenshot-report.png) | ![Plan](docs/screenshot-plan.png) | ![Action plan](docs/screenshot-action-plan.png) | ![Product page](docs/screenshot-product.png) |

---|---|---|---|
| ![Route](docs/screenshot-route.png) | ![New York result](docs/screenshot-nyc.png) | ![Miami result](docs/screenshot-miami.png) | ![Product page](docs/screenshot-product.png) |

---

## How it works

The app is four steps on one mobile page; finished steps collapse into a summary you can edit.

1. **Trip** — *From* and *To* (country first, then city, with autocomplete; "Use my location"), an animated flight map, dates, transport (multi-select) and activity tags that flow into free-text notes. `/api/weather` returns:
   - **Predicted weather** when the whole trip is within 16 days (Open-Meteo / OpenWeather forecast),
   - **Typical for these dates** further out: last year's weather for the same dates from the Open-Meteo archive (UV is estimated from latitude and season if the archive has none, and labelled "est."),
   - plus the **current climate at home**, so the plan can react to the change ("25°C colder and 38 pts drier than Taipei").
2. **Skin scan** — a passport-style scanner: MediaPipe Face Landmarker tracks 478 face points live in the browser and auto-captures when the face is steady; while YouCam analyzes, the photo becomes a rotating 3D mesh with a checklist tied to the real request status. The report overlays **YouCam's per-concern masks** on the photo and shows each score InBody-style: grey zones **Weak <45 · Normal 45–69 · Strong ≥70** (SkinPassport reference ranges, not medical norms) and a **trip risk** (Low / Medium / High) that combines today's score with the destination.
   YouCam flow: `POST /s2s/v2.0/file/skin-analysis` → upload to the presigned URL → `POST /s2s/v2.0/task/skin-analysis` → poll `GET /s2s/v2.0/task/skin-analysis/{id}`.
3. **My shelf (optional)** — search our catalog or **Open Beauty Facts** (any brand), or add a product by name. The app guesses the type and SPF from the name and flags retinoids/acids. Owned products:
   - cover a category ("Packed from home"), after a **spec check** (e.g. "Yours is SPF 30 — this trip needs SPF 50+, water-resistant"),
   - make similar picks from the same brands rank higher,
   - leave the remaining needs as the **complementary** picks,
   - trigger warnings (retinol + strong sun → pause 3 days before, leave it at home).
4. **Plan** — bullet summary with **bold** key facts (template, or rewritten by Claude), then one list grouped by tag. Each card shows the product for the chosen budget (Value / Balanced / Premium), trending ingredient badges, **ingredient-based reasons**, cautions, "+ Bag" and "I already have this". Nothing is pre-selected.
5. **Action plan** (`/plan`) — built from the bag + what you have:
   - **Before the trip** adapts to the days left (e.g. a vitamin C serum is only suggested with 3+ weeks to go; otherwise "too short — rely on sunscreen"; order-by date; patch test; pause actives),
   - **During the trip**: travel day, every morning, every night, reminders — using your actual product names,
   - **Shopping list**: bag items with prices + items from home without prices.
   "Save as image" exports a phone-size PNG (share sheet on mobile → Save Image).

### Engine (`src/lib/engine/`, pure and unit-tested)

| File | What it does |
|---|---|
| `necessity.ts` | Skin concern levels × climate stress (UV with snow/water reflection, dry air, humidity, cold, heat, pollution, change from home, transport) → Necessity Score + tag; drops long-term brightening when the trip is under 3 weeks away |
| `report.ts` | Bands (Weak/Normal/Strong) and trip risk with its main reason |
| `ingredients.ts` | Ingredient knowledge base in cosmetic language (what each helps with, trending flag, cautions) |
| `reasons.ts` | Matches a product's **verified** ingredients to the user's weakest scores and the destination |
| `recommend.ts` | One pick per budget tier, owned-product spec checks, multi-use de-duplication |
| `actionPlan.ts` | Before / During / Shopping list |
| `summary.ts` | Template bullet summary |

### Catalog (`src/lib/shop/catalog.ts`)

24 products, 21 from **L'Oréal Groupe** brands (CeraVe, La Roche-Posay, Kiehl's, Vichy, SkinCeuticals, Lancôme, L'Oréal Paris, Garnier) and 3 others where L'Oréal had no fit. Every ingredient we mention was checked against the product's published INCI list (source link on each product page); brand claims such as "water-resistant 80 minutes" were checked on retailer pages. Descriptions are written in our own words. The `ShopProvider` interface lets you swap in a live store API — see [docs/shop-api-survey.md](docs/shop-api-survey.md).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4, mobile-first |
| Backend | Next.js Route Handlers (`src/app/api/*`) — all API keys stay on the server |
| Skin AI | YouCam AI Skin Analysis API |
| Weather | Open-Meteo (default, no key) or OpenWeather |
| LLM | Anthropic Claude (optional) |
| Map | d3-geo + world-atlas (Natural Earth), animated in SVG |
| Face scan | MediaPipe Face Landmarker (in-browser, 478 3D points) + YouCam masks |
| Product photos | Open Beauty Facts (CC BY-SA 3.0), backgrounds removed with @imgly/background-removal-node |
| Image export | html-to-image (action plan → PNG) |
| Tests | Vitest (`src/lib/**/__tests__`) |

## Project structure

```
src/
  app/
    page.tsx                 # mobile UI (Trip → Scan → Shelf → Plan)
    plan/page.tsx            # action plan + save as image
    product/[id]/page.tsx    # product detail pages
    api/skin/analyze         # YouCam: upload + create task
    api/skin/status          # YouCam: poll task
    api/places               # country-filtered city autocomplete
    api/weather              # trip forecast, home climate, or demo scenario
    api/plan                 # engine + report + picks + summary
    api/products/search      # catalog + Open Beauty Facts search for "My shelf"
    api/health               # which integrations are live
  components/                # CameraCapture, ScanResult, ShelfStep, Results, ActionPlanView, ProductView…
  lib/
    engine/                  # necessity, report, ingredients, reasons, recommend, actionPlan, summary
    server/                  # youcam.ts, weather.ts, llm.ts (server-only)
    shop/                    # catalog.ts, provider.ts
    places.ts                # countries + popular cities for instant autocomplete
    shelf.ts                 # guess type / SPF / retinoids for owned products
    store.ts                 # client state shared across pages (sessionStorage)
docs/                        # architecture, screenshots, shop API survey
```

## Run it locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local   # add YOUCAM_API_KEY (others optional)
npm run dev                  # http://localhost:3000
npm test                     # engine unit tests
npm run setup:assets         # one-time: product photos + face-scan model (needs internet, ~5 min)
```

`setup:assets` downloads front photos from Open Beauty Facts, removes the backgrounds on your machine, and saves them to `public/products/`. It also downloads the MediaPipe face model to `public/models/`. Products without a photo keep the illustrated pack shot, and the app loads the face model from Google's CDN if it isn't saved locally.

Every integration has a fallback, so the app runs with **no keys at all**: demo skin scan, Open-Meteo weather, template coach note. Set `MOCK_YOUCAM=1` to film the demo without spending YouCam units.

## Limitations and next steps

- Product prices are estimates; the next step is a live Shop API (Shopify Storefront or Amazon Creators API).
- Trips more than 16 days out use last year's weather; a multi-year climate average would be steadier.
- Calendar sync (Google Calendar) to detect upcoming trips automatically.
- Live prices from a store API.
- YouCam Virtual Try-On for the recommended products.

## Credits

- Ingredient lists checked on [Skinsort](https://skinsort.com) and retailer pages (links on each product page).
- Product photos: [Open Beauty Facts](https://world.openbeautyfacts.org) contributors, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/); edited (backgrounds removed). Full list in [docs/IMAGE_CREDITS.md](docs/IMAGE_CREDITS.md).
- Map data: Natural Earth via world-atlas.

Not medical advice.
