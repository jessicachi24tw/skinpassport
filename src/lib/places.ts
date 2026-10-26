// Countries and popular cities for instant autocomplete (works offline / in demos).
// The /api/places route merges these with live Open-Meteo geocoding results.

import type { Country, Place } from "./types";

export const COUNTRIES: Country[] = [
  ["US", "United States"], ["CA", "Canada"], ["MX", "Mexico"], ["BR", "Brazil"], ["AR", "Argentina"], ["CL", "Chile"], ["PE", "Peru"], ["CO", "Colombia"],
  ["GB", "United Kingdom"], ["IE", "Ireland"], ["FR", "France"], ["DE", "Germany"], ["IT", "Italy"], ["ES", "Spain"], ["PT", "Portugal"], ["NL", "Netherlands"],
  ["BE", "Belgium"], ["CH", "Switzerland"], ["AT", "Austria"], ["CZ", "Czechia"], ["PL", "Poland"], ["GR", "Greece"], ["TR", "Türkiye"], ["SE", "Sweden"],
  ["NO", "Norway"], ["DK", "Denmark"], ["FI", "Finland"], ["IS", "Iceland"], ["HU", "Hungary"], ["HR", "Croatia"],
  ["AE", "United Arab Emirates"], ["SA", "Saudi Arabia"], ["QA", "Qatar"], ["IL", "Israel"], ["EG", "Egypt"], ["MA", "Morocco"], ["ZA", "South Africa"], ["KE", "Kenya"],
  ["JP", "Japan"], ["KR", "South Korea"], ["TW", "Taiwan"], ["CN", "China"], ["HK", "Hong Kong"], ["SG", "Singapore"], ["MY", "Malaysia"], ["TH", "Thailand"],
  ["VN", "Vietnam"], ["PH", "Philippines"], ["ID", "Indonesia"], ["IN", "India"], ["MV", "Maldives"], ["NP", "Nepal"],
  ["AU", "Australia"], ["NZ", "New Zealand"], ["FJ", "Fiji"],
].map(([code, name]) => ({ code, name }));

/** Flag emoji from an ISO country code. */
export const flag = (code: string) => code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));

type Row = [name: string, admin1: string, cc: string, lat: number, lon: number];

const ROWS: Row[] = [
  ["New York", "New York", "US", 40.713, -74.006], ["Newark", "New Jersey", "US", 40.736, -74.172], ["Jersey City", "New Jersey", "US", 40.728, -74.078],
  ["New Orleans", "Louisiana", "US", 29.951, -90.072], ["New Haven", "Connecticut", "US", 41.308, -72.928], ["Ithaca", "New York", "US", 42.444, -76.502],
  ["Boston", "Massachusetts", "US", 42.36, -71.059], ["Washington", "District of Columbia", "US", 38.907, -77.037], ["Miami", "Florida", "US", 25.762, -80.192],
  ["Orlando", "Florida", "US", 28.538, -81.379], ["Chicago", "Illinois", "US", 41.878, -87.63], ["Denver", "Colorado", "US", 39.739, -104.99],
  ["Aspen", "Colorado", "US", 39.191, -106.818], ["Las Vegas", "Nevada", "US", 36.17, -115.14], ["Los Angeles", "California", "US", 34.052, -118.244],
  ["San Francisco", "California", "US", 37.775, -122.419], ["San Diego", "California", "US", 32.716, -117.161], ["Seattle", "Washington", "US", 47.606, -122.332],
  ["Honolulu", "Hawaii", "US", 21.307, -157.858], ["Austin", "Texas", "US", 30.267, -97.743], ["Phoenix", "Arizona", "US", 33.448, -112.074],
  ["Toronto", "Ontario", "CA", 43.653, -79.383], ["Vancouver", "British Columbia", "CA", 49.283, -123.121], ["Montreal", "Quebec", "CA", 45.502, -73.567], ["Whistler", "British Columbia", "CA", 50.116, -122.957],
  ["Cancún", "Quintana Roo", "MX", 21.162, -86.851], ["Mexico City", "Mexico City", "MX", 19.433, -99.133], ["Rio de Janeiro", "Rio de Janeiro", "BR", -22.907, -43.173],
  ["London", "England", "GB", 51.507, -0.128], ["Edinburgh", "Scotland", "GB", 55.953, -3.188], ["Dublin", "Leinster", "IE", 53.35, -6.26],
  ["Paris", "Île-de-France", "FR", 48.857, 2.352], ["Nice", "Provence-Alpes-Côte d'Azur", "FR", 43.71, 7.262], ["Chamonix", "Auvergne-Rhône-Alpes", "FR", 45.924, 6.869],
  ["Berlin", "Berlin", "DE", 52.52, 13.405], ["Munich", "Bavaria", "DE", 48.135, 11.582], ["Rome", "Lazio", "IT", 41.903, 12.496], ["Milan", "Lombardy", "IT", 45.464, 9.19],
  ["Barcelona", "Catalonia", "ES", 41.385, 2.173], ["Madrid", "Madrid", "ES", 40.417, -3.704], ["Lisbon", "Lisbon", "PT", 38.722, -9.139],
  ["Amsterdam", "North Holland", "NL", 52.368, 4.904], ["Zurich", "Zurich", "CH", 47.377, 8.541], ["Zermatt", "Valais", "CH", 46.02, 7.749], ["Vienna", "Vienna", "AT", 48.208, 16.373],
  ["Prague", "Prague", "CZ", 50.075, 14.438], ["Athens", "Attica", "GR", 37.984, 23.728], ["Santorini", "South Aegean", "GR", 36.393, 25.461], ["Istanbul", "Istanbul", "TR", 41.008, 28.978],
  ["Stockholm", "Stockholm", "SE", 59.329, 18.069], ["Reykjavík", "Capital Region", "IS", 64.147, -21.942], ["Tromsø", "Troms", "NO", 69.649, 18.956],
  ["Dubai", "Dubai", "AE", 25.205, 55.271], ["Doha", "Doha", "QA", 25.285, 51.531], ["Cairo", "Cairo", "EG", 30.044, 31.236], ["Marrakesh", "Marrakesh-Safi", "MA", 31.629, -7.981],
  ["Cape Town", "Western Cape", "ZA", -33.925, 18.424], ["Nairobi", "Nairobi", "KE", -1.292, 36.822],
  ["Tokyo", "Tokyo", "JP", 35.676, 139.65], ["Osaka", "Osaka", "JP", 34.694, 135.502], ["Kyoto", "Kyoto", "JP", 35.012, 135.768], ["Sapporo", "Hokkaido", "JP", 43.062, 141.354],
  ["Niseko", "Hokkaido", "JP", 42.805, 140.687], ["Okinawa", "Okinawa", "JP", 26.212, 127.681], ["Seoul", "Seoul", "KR", 37.567, 126.978], ["Busan", "Busan", "KR", 35.18, 129.075], ["Jeju", "Jeju", "KR", 33.499, 126.531],
  ["Taipei", "Taipei", "TW", 25.033, 121.565], ["Taichung", "Taichung", "TW", 24.148, 120.674], ["Kaohsiung", "Kaohsiung", "TW", 22.627, 120.301], ["Hualien", "Hualien", "TW", 23.991, 121.611],
  ["Shanghai", "Shanghai", "CN", 31.23, 121.474], ["Beijing", "Beijing", "CN", 39.904, 116.407], ["Hong Kong", "Hong Kong", "HK", 22.319, 114.169], ["Singapore", "Singapore", "SG", 1.352, 103.82],
  ["Kuala Lumpur", "Kuala Lumpur", "MY", 3.139, 101.687], ["Bangkok", "Bangkok", "TH", 13.756, 100.502], ["Phuket", "Phuket", "TH", 7.88, 98.392], ["Chiang Mai", "Chiang Mai", "TH", 18.788, 98.985],
  ["Hanoi", "Hanoi", "VN", 21.028, 105.854], ["Ho Chi Minh City", "Ho Chi Minh City", "VN", 10.823, 106.63], ["Da Nang", "Da Nang", "VN", 16.054, 108.202],
  ["Manila", "Metro Manila", "PH", 14.6, 120.984], ["Boracay", "Western Visayas", "PH", 11.968, 121.925], ["Bali (Denpasar)", "Bali", "ID", -8.65, 115.217],
  ["New Delhi", "Delhi", "IN", 28.614, 77.209], ["Mumbai", "Maharashtra", "IN", 19.076, 72.878], ["Malé", "Malé", "MV", 4.175, 73.509], ["Kathmandu", "Bagmati", "NP", 27.717, 85.324],
  ["Sydney", "New South Wales", "AU", -33.869, 151.209], ["Melbourne", "Victoria", "AU", -37.814, 144.963], ["Cairns", "Queensland", "AU", -16.92, 145.771],
  ["Auckland", "Auckland", "NZ", -36.848, 174.763], ["Queenstown", "Otago", "NZ", -45.031, 168.663],
];

const countryName = (cc: string) => COUNTRIES.find((c) => c.code === cc)?.name ?? cc;

export const CITIES: Place[] = ROWS.map(([name, admin1, cc, lat, lon]) => ({
  id: `local-${cc}-${name}`.toLowerCase().replace(/\s+/g, "-"),
  name,
  admin1,
  country: countryName(cc),
  countryCode: cc,
  lat,
  lon,
}));

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Prefix matches first, then word / substring matches. */
function rank<T>(items: T[], q: string, keys: (t: T) => string[]) {
  const n = norm(q);
  if (!n) return items;
  const scored: [T, number][] = [];
  for (const it of items) {
    const ks = keys(it).map(norm);
    let s = -1;
    if (ks.some((k) => k.startsWith(n))) s = 3;
    else if (ks.some((k) => k.split(/[\s,()-]+/).some((w) => w.startsWith(n)))) s = 2;
    else if (ks.some((k) => k.includes(n))) s = 1;
    if (s > 0) scored.push([it, s]);
  }
  return scored.sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

export const searchCountries = (q: string) => rank(COUNTRIES, q, (c) => [c.name, c.code]);

export const searchLocalCities = (q: string, countryCode?: string) =>
  rank(countryCode ? CITIES.filter((c) => c.countryCode === countryCode) : CITIES, q, (c) => [c.name, c.admin1 ?? ""]);

export const placeLabel = (p: Place) => [p.name, p.admin1 && p.admin1 !== p.name ? p.admin1 : null, p.country].filter(Boolean).join(", ");
