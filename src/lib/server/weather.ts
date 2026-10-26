import "server-only";
// Destination climate for the trip window.
// Default provider: Open-Meteo (free, no key). If OPENWEATHER_API_KEY is set,
// temperature/humidity/air quality come from OpenWeather instead.

import type { Climate, Place } from "../types";

const TIMEOUT = 12000;

async function getJson(url: string) {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT), cache: "no-store" });
  } catch {
    throw new Error("Can't reach the weather service right now. Check your connection or try a demo destination.");
  }
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

type Coords = { name: string; lat: number; lon: number };

/** Live city search (Open-Meteo geocoding), optionally limited to one country. */
export async function searchPlaces(query: string, countryCode?: string): Promise<Place[]> {
  const cc = countryCode ? `&countryCode=${encodeURIComponent(countryCode)}` : "";
  const data = await getJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=en&format=json${cc}`);
  type R = { id: number; name: string; admin1?: string; country?: string; country_code?: string; latitude: number; longitude: number };
  return ((data?.results ?? []) as R[]).map((r) => ({
    id: `om-${r.id}`,
    name: r.name,
    admin1: r.admin1,
    country: r.country ?? "",
    countryCode: (r.country_code ?? "").toUpperCase(),
    lat: r.latitude,
    lon: r.longitude,
  }));
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

async function openMeteo(place: Coords, start: string, end: string): Promise<Omit<Climate, "locationName" | "source">> {
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
async function openWeather(place: Coords, dates: string[], key: string): Promise<Omit<Climate, "locationName" | "source">> {
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

const isoToday = () => new Date().toISOString().slice(0, 10);

/** Climate at `place` for the trip window (start date + days). */
export async function getTripClimate(place: Coords, startDate: string, days: number): Promise<Climate> {
  const today = new Date(isoToday() + "T00:00:00Z");
  const start = new Date(`${startDate}T00:00:00Z`);
  const offset = Math.round((start.getTime() - today.getTime()) / 86400000);
  if (Number.isNaN(offset)) throw new Error("Invalid start date.");
  if (offset < 0) throw new Error("The trip start date is in the past.");
  if (offset >= FORECAST_HORIZON_DAYS) {
    throw new Error(`Forecasts only reach ${FORECAST_HORIZON_DAYS} days ahead. Pick closer dates or try a demo destination.`);
  }
  const span = Math.max(1, Math.min(days, FORECAST_HORIZON_DAYS - offset));
  const dates = dateRange(startDate, span);
  const key = process.env.OPENWEATHER_API_KEY;
  if (key) {
    try {
      return { locationName: place.name, source: "openweather", ...(await openWeather(place, dates, key)) };
    } catch {
      // OpenWeather's free forecast only covers 5 days — fall back to Open-Meteo.
    }
  }
  return { locationName: place.name, source: "open-meteo", ...(await openMeteo(place, dates[0], dates[dates.length - 1])) };
}

/** Climate at home right now (today + next 2 days), used for the temperature-shift comparison. */
export async function getCurrentClimate(place: Coords): Promise<Climate> {
  return getTripClimate(place, isoToday(), 3);
}
