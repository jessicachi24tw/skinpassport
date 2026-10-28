# SkinPassport — Hackathon submission

## Project description (paste into the submission form)

**SkinPassport is a geo-adaptive skincare coach that tells travelers what their skin will need before they leave.**

Travel quietly damages skin: dry airplane cabins, freezing winter air, or a sudden UV-11 beach day. Most people only notice once the dryness, redness or sunburn has started — and then buy the wrong products at the airport.

**What we built.** A mobile web app in four steps:

1. **Trip** — From/To (country → city autocomplete) on an animated flight map, dates, transport and activity tags. We fetch the **predicted weather** for trips within 16 days, or **typical weather for those dates** further out — plus the climate at home, so the plan reacts to the change.
2. **Skin scan** — a passport-style face scan (in-browser 3D face mesh) analyzed by the **YouCam AI Skin Analysis API**. The report shows YouCam's per-concern masks and an **InBody-style** view: each score in grey reference zones (Weak · Normal · Strong) plus a **trip risk** for the destination.
3. **My shelf (optional)** — add products you already use (our catalog or Open Beauty Facts). We check them against the trip (e.g. "your SPF 30 is too low for Miami"), prefer similar products from brands you like, and flag retinoids before a sunny trip.
4. **Plan** — a **Necessity Score** and Must-pack / Recommended / Nice-to-have tag per category, with picks from a **L'Oréal Groupe-first catalog** in three budgets. Every pick is explained by its **verified ingredients** matched to your weakest scores ("Your Moisture is Weak (32) → contains Ceramides, which rebuild the skin barrier"). Users choose what to buy and what they already have, then get an **action plan** — Before the trip (adapted to the days left), During the trip, and a Shopping list — saved to their phone as an image.

**How it works.** Next.js frontend and API routes (all keys server-side). A deterministic, unit-tested rule engine computes scores, bands, risks, picks and the plan; Claude only rewrites the summary bullets. Ingredients were checked against each product's published INCI list.

**Demo highlight.** The same dry-skin scan produces a different plan for New York in winter (ceramide cream, hydrating serum, lip repair, SPF 30) and Miami in July (SPF 50+ water-resistant sunscreen, after-sun gel, light gel moisturizer).

**Business value.** Contextual commerce: recommendations arrive exactly when the user is about to buy (before a trip), with an ingredient-level reason tied to their own skin. A beauty group such as L'Oréal can plug in its catalog across price tiers (CeraVe → La Roche-Posay → SkinCeuticals), and the "my shelf" step turns existing customers into repeat buyers of the same brands.

**Built with:** YouCam AI Skin Analysis API, Next.js, React, TypeScript, Tailwind CSS, MediaPipe Face Landmarker, Open-Meteo / OpenWeather, Open Beauty Facts, Anthropic Claude.

## Checklist

- [ ] Project description — above
- [ ] Demo video (2–3 min) — script in `docs/DEMO_SCRIPT.md`, upload to YouTube (unlisted) or Loom
- [ ] GitHub repo link — public repo with README, architecture diagram, screenshots and `.env.example`
- [ ] Repo does **not** contain `.env.local` or any API key
