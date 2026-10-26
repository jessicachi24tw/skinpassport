# SkinPassport — Hackathon submission

## Project description (paste into the submission form)

**SkinPassport is a geo-adaptive skincare coach that tells travelers what their skin will need before they leave.**

Travel quietly damages skin: dry airplane cabins, freezing winter air, or a sudden UV-11 beach day. Most people only notice once the dryness, redness or sunburn has started — and then buy the wrong products at the airport.

**What we built.** A mobile web app with three steps:

1. **Scan** — a selfie is analyzed by the **YouCam AI Skin Analysis API** (moisture, oiliness, redness, dark spots, acne, pores, texture, radiance).
2. **Plan the trip** — type it naturally ("ski trip to Hokkaido next week for 4 days") or fill in a form. We fetch the destination forecast for the exact trip dates: temperature, humidity, UV index and air quality.
3. **Get the plan** — a rule engine fuses skin scores with climate stress factors and gives every product category a **Necessity Score (0–100)**. The result is a pre-trip routine for the days before departure, an **Essential kit** (must-pack only) and a **Complete kit**, each with Buy now links and an estimated cart total. Claude writes a short, friendly explanation of *why*.

**How it works.** Next.js frontend and Next.js API routes as the backend, so the YouCam, weather and LLM keys never reach the browser. The backend handles YouCam's file upload → task → polling flow. The Necessity Score is deterministic and explainable: for example, UV ≥ 8 raises sunscreen to SPF 50+ / PA++++, snow and water multiply effective UV, low moisture + dry cold air pushes ceramide barrier cream to must-pack, while hot humid weather swaps it for a gel moisturizer. The LLM explains the result but never decides it.

**Demo highlight.** The same dry-skin scan produces a different cart for New York in winter (barrier cream, hydrating serum, lip repair, SPF 30) and Miami in July (SPF 60 water-resistant sunscreen, after-sun gel, light gel moisturizer).

**Business value.** Contextual commerce: recommendations arrive exactly when the user is about to buy (before a trip) with a clear reason, which converts better than generic ads. Brands can plug in their catalogs, and travel-size kits are a natural bundle.

**Built with:** YouCam AI Skin Analysis API, Next.js, React, TypeScript, Tailwind CSS, Open-Meteo / OpenWeather, Anthropic Claude.

## Checklist

- [ ] Project description — above
- [ ] Demo video (2–3 min) — script in `docs/DEMO_SCRIPT.md`, upload to YouTube (unlisted) or Loom
- [ ] GitHub repo link — public repo with README, architecture diagram, screenshots and `.env.example`
- [ ] Repo does **not** contain `.env.local` or any API key
