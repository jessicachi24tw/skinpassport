# SkinPassport: Hackathon submission

## Links

- **Live demo:** https://skinpassport.vercel.app
- **Demo video:** https://drive.google.com/file/d/1PwvQvGpQDZgBTFWHWpaxSZKECiwGya3V/view?usp=sharing
- **Code:** https://github.com/jessicachi24tw/skinpassport

## Project description (paste into the submission form)

**SkinPassport is a geo-adaptive skincare coach that tells travelers what their skin will need before they leave.**

Travel quietly damages skin: dry airplane cabins, freezing winter air, or a sudden UV-11 beach day. Most people only notice once the dryness, redness or sunburn has started, and then buy the wrong products at the airport.

**What we built.** A mobile web app in four steps:

1. **Set your trip**: From/To (country → city autocomplete) on an animated flight map, dates, transport and activity tags. We fetch the **predicted weather** for trips within 16 days, or **typical weather for those dates** further out, plus the climate at home, so the plan reacts to the change.
2. **Scan your skin**: a passport-style face scan (in-browser 3D face mesh) analyzed by the **YouCam AI Skin Analysis API** with **9 scores (incl. pores, acne, texture, fine lines) plus skin type** (whole face, T-zone, U-zone). Skin type steers the plan: rich creams for dry skin, light gels for oily and combination skin, zone advice (gel on the T-zone, cream on the cheeks), and gentle, fragrance-free care first for redness-prone types. The report shows YouCam's per-concern masks and the 4 travel-sensitive scores first, and an **InBody-style** view: each score in grey reference zones (Weak · Normal · Strong) plus a **trip risk** for the destination.
3. **Add your shelf (optional)**: add products you already use with two dropdowns, Brand → Product (or type any other). We check them against the trip (e.g. "your SPF 30 is too low for Miami"), prefer similar products from brands you like, and flag retinoids before a sunny trip.
4. **Get your plan**: first, **Today / Without protection** on the user's own face: coral marks where the trip puts skin at risk, and an illustration of what could happen without protection. Then a **Necessity Score** and Must-pack / Recommended / Nice-to-have tag per category, with picks from a **L'Oréal Groupe-first catalog** in three budgets. Beyond the basics, targeted care (blemish, pore-refining, gentle exfoliant, line-smoothing) and a cleanser picked by concern. Each card stays simple (necessity number + bar, product, + Bag, I already have it); folded under "Why this one", every pick shows which of the user's measures it **targets**, the **percentage the brand states** (strength weighed against skin type and sun, since higher is not always better), and is explained by its **verified ingredients** matched to your weakest scores ("Your Moisture is Weak (32) → contains Ceramides, which rebuild the skin barrier"). Users choose what to buy and what they already have, then get an **action plan**: a **YouCam AI Skin Simulation** of their own face after the plan (a before/after slider that only improves the concerns their chosen products address, at a realistic intensity), a 3D passport stamped **Well protected** once every must-pack is covered, Before the trip steps adapted to the days left, and a visual During the trip routine with product photos, saved to their phone as an image.

**My passports + Check a product.** Every plan is saved on the device (no account, photos never leave the phone) and shows how scores changed since the last scan. Inside a passport, users type any product they're considering; we find its ingredient list (our catalog, Open Beauty Facts, then a Claude agent with web search that must cite the page it copied from) and score it against their skin and trip: Swap in, Adds to your plan, Not for this trip, or Not needed now.

**How it works.** Next.js frontend and API routes (all keys server-side). A deterministic, unit-tested rule engine computes scores, bands, risks, picks and the plan; Claude only rewrites the summary bullets. Ingredients were checked against each product's published INCI list.

**Demo highlight.** The same dry-skin scan produces a different plan for New York in winter (ceramide cream, hydrating serum, lip repair, SPF 30) and Miami in July (SPF 50+ water-resistant sunscreen, after-sun gel, light gel moisturizer).

**Business value.** Contextual commerce: recommendations arrive exactly when the user is about to buy (before a trip), with an ingredient-level reason tied to their own skin. A beauty group such as L'Oréal can plug in its catalog across price tiers (CeraVe → La Roche-Posay → SkinCeuticals), and the "my shelf" step turns existing customers into repeat buyers of the same brands.

**Built with:** YouCam AI Skin Analysis API, YouCam AI Skin Simulation API, Next.js, React, TypeScript, Tailwind CSS, MediaPipe Face Landmarker, Open-Meteo / OpenWeather, Open Beauty Facts, Anthropic Claude.

## Checklist

- [ ] Project description, above
- [x] Live demo: https://skinpassport.vercel.app
- [x] Demo video (2–3 min): https://drive.google.com/file/d/1PwvQvGpQDZgBTFWHWpaxSZKECiwGya3V/view?usp=sharing
- [ ] GitHub repo link, public repo with README, architecture diagram, screenshots and `.env.example`
- [ ] Repo does **not** contain `.env.local` or any API key
