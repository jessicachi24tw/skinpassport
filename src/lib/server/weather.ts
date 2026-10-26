import "server-only";
// Destination climate for the trip window.
// Default provider: Open-Meteo (free, no key). If OPENWEATHER_API_KEY is set,
// temperature/humidity/air quality come from OpenWeather instead.

import type { Climate } from "../types";

const TIMEOUT = 12000;

async function getJson(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  if (!res.ok) throw new Error(`Weather service error (HTTP ${res.status})`);
  return res.json();
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const nums = (xs: unknown): number[] => (Array.isArray(xs) ? xs.filter((x): x is number => typeof x === "number") : []);
const round = (n: number) => Math.round(n * 10) / 10;

/** US EPA AQI from a PM2.5 concentration (µg/m³). Used as a fallback. */
export function pm25ToUsAqi(pm: number) {
  const bp = [
    [0, 9, 0, 50],
    [9.1, 35.4, 51, 100],
    [35.5, 55.4, 101, 150],
    [55.5, 125.4, 151, 200],
    [125.5, 225.4, 201, 300],
    [225.5, 500, 301, 500],
  ];
  for (const [cLo, cHi, iLo, iHi] of bp) {
    if (pm <= cHi) return Math.round(((iHi - iLo) / (cHi - cLo)) * (Math.max(pm, cLo) - cLo) + iLo);
  }
  return 500;
}

export interface Place {
  name: string;
  lat: number;
  lon: number;
}

export async function geocode(query: string): Promise<Place> {
  const q = query.split(",")[0].trim();
  const data = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
  const r = data?.results?.[0];
  if (!r) throw new Error(`Could not find "${query}". Try a city name, e.g. "Sapporo".`);
  return { name: [r.name, r.admin1, r.country].filter(Boolean).join(", "), lat: r.latitude, lon: r.longitude };
}

/** Inclusive list of YYYY-MM-DD dates. */
function dateRange(start: string, days: number) {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export const FORECAST_HORIZON_DAYS = 16;

async function openMeteo(place: Place, start: string, end: string): Promise<Omit<Climate, "locationName" | "source">> {
  const base = `latitude=${place.lat}&longitude=${place.lon}&start_date=${start}&end_date=${end}&timezone=auto`;
  const wx = await getJson(
    `https://api.open-meteo.com/v1/forecast?${base}&daily=temperature_2m_max,temperature_2m_min,uv_index_max&hourly=relative_humidity_2m`,
  );
  // Air quality forecasts only reach ~5 days ahead; missing data is fine.
  let aqiMax: number | null = null;
  try {
    const aq = await getJson(`https://air-quality-api.open-meteo.com/v1/air-quality?${base}&hourly=us_aqi,pm2_5`);
    const us = nums(aq?.hourly?.us_aqi);
    const pm = nums(aq?.hourly?.pm2_5);
    if (us.length) aqiMax = Math.max(...us);
    else if (pm.length) aqiMax = pm25ToUsAqi(Math.max(...pm));
  } catch {
    aqiMax = null;
  }
  const tMax = nums(wx?.daily?.temperature_2m_max);
  const tMin = nums(wx?.daily?.temperature_2m_min);
  const uv = nums(wx?.daily?.uv_index_max);
  const rh = nums(wx?.hourly?.relative_humidity_2m);
  if (!tMax.length || !tMin.length) throw new Error("No forecast available for those dates.");
  return {
    tempMinC: round(Math.min(...tMin)),
    tempMaxC: round(Math.max(...tMax)),
    humidityPct: Math.round(avg(rh)),
    uvMax: round(uv.length ? Math.max(...uv) : 0),
    aqiMax,
  };
}

/** OpenWeather 5-day / 3-hour forecast + air pollution forecast. UV still comes from Open-Meteo. */
async function openWeather(place: Place, dates: string[], key: string): Promise<Omit<Climate, "locationName" | "source">> {
  const q = `lat=${place.lat}&lon=${place.lon}&appid=${key}`;
  const fc = await getJson(`https://api.openweathermap.org/data/2.5/forecast?${q}&units=metric`);
  const inTrip = (dt: number) => dates.includes(new Date(dt * 1000).toISOString().slice(0, 10));
  const slots = (fc?.list ?? []).filter((x: { dt: number }) => inTrip(x.dt));
  if (!slots.length) throw new Error("OpenWeather only forecasts 5 days ahead. Pick closer dates or use a demo scenario.");
  type Slot = { main: { temp_min: number; temp_max: number; humidity: number } };
  let aqiMax: number | null = null;
  try {
    const ap = await getJson(`https://api.openweathermap.org/data/2.5/air_pollution/forecast?${q}`);
    const pm = (ap?.list ?? []).filter((x: { dt: number }) => inTrip(x.dt)).map((x: { components: { pm2_5: number } }) => x.components.pm2_5);
    if (pm.length) aqiMax = pm25ToUsAqi(Math.max(...pm));
  } catch {
    aqiMax = null;
  }
  let uvMax = 0;
  try {
    const om = await openMeteo(place, dates[0], dates[dates.length - 1]);
    uvMax = om.uvMax;
  } catch {
    uvMax = 0;
  }
  return {
    tempMinC: round(Math.min(...slots.map((s: Slot) => s.main.temp_min))),
    tempMaxC: round(Math.max(...slots.map((s: Slot) => s.main.temp_max))),
    humidityPct: Math.round(avg(slots.map((s: Slot) => s.main.humidity))),
    uvMax,
    aqiMax,
  };
}

export async function getTripClimate(destination: string, startDate: string, days: number): Promise<Climate> {
  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const start = new Date(`${startDate}T00:00:00Z`);
  const offset = Math.round((start.getTime() - today.getTime()) / 86400000);
  if (Number.isNaN(offset)) throw new Error("Invalid start date.");
  if (offset < 0) throw new Error("The trip start date is in the past.");
  const span = Math.max(1, Math.min(days, FORECAST_HORIZON_DAYS - offset));
  if (offset >= FORECAST_HORIZON_DAYS) {
    throw new Error(`Forecasts only reach ${FORECAST_HORIZON_DAYS} days ahead. Pick closer dates or try a demo scenario.`);
  }
  const dates = dateRange(startDate, span);
  const place = await geocode(destination);
  const key = process.env.OPENWEATHER_API_KEY;
  const data = key ? await openWeather(place, dates, key) : await openMeteo(place, dates[0], dates[dates.length - 1]);
  return { locationName: place.name, source: key ? "openweather" : "open-meteo", ...data };
}
