# Shop API survey (October 2026)

Goal: turn each recommendation into a real product with a price and a "Buy now" action, within a 7-day hackathon.

| Option | What you get | Access | Effort | Verdict |
|---|---|---|---|---|
| **Curated catalog + retailer links** (current MVP) | Full control of products, stable demo | None | Very low | ✅ Use for the demo |
| **Shopify Storefront API** (free dev store) | Real products, prices, a real cart and checkout URL (`cartCreate`) | Free Partner account + dev store | Low–medium | ⭐ Best upgrade for "real cart" |
| **Amazon Creators API** (replaced PA-API 5) | Huge catalog, live prices, affiliate revenue | Approved Amazon Associates account; PA-API 5 calls now return 403 | Medium, approval risk | Later / business model |
| **Affiliate networks** (Rakuten, Impact, CJ) for Sephora / Ulta / brand sites | Product feeds + commission links | Publisher approval per brand | Medium–high, slow approval | Later |
| **Brand sites (e.g. L'Oréal brands)** | No public product API | Partnership only | High | Pitch as B2B partner, don't integrate now |
| **Open Beauty Facts** | Free open ingredient data, no prices or checkout | None | Low | Optional: ingredient warnings |
| **Scraping / browser extension** | Works on any shop page | Extension install; scraping breaks ToS | High, fragile | ❌ Not for this hackathon |

## Recommendation

1. **Demo (this week):** keep the curated catalog. Products are real, the cart changes deterministically between scenarios, and nothing can fail on stage. Add an Amazon Associates tag via `NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG` if you have one.
2. **Stretch goal:** a Shopify dev store with ~15 products, implementing `ShopProvider` with Storefront API search + `cartCreate`, so "Buy the Essential kit" opens one real checkout.
3. **Business story for judges:** brands (L'Oréal, Shiseido, Estée Lauder groups) pay for contextual placement or plug in their catalog — this is the Contextual Commerce revenue model.

A browser extension solves a different problem (helping users while browsing a shop), adds install friction, and can't create a cart across retailers, so it's a weak fit for a mobile-first demo.
