// Tiny client-side store shared by every page (home, product pages, bag).
// It survives navigation and page refreshes (sessionStorage) without a server.

import { useSyncExternalStore } from "react";
import type { Climate, PlanResult, SkinProfile, TripInput } from "./types";

export interface AppState {
  skin: SkinProfile | null;
  trip: TripInput;
  originClimate: Climate | null;
  climate: Climate | null;
  plan: PlanResult | null;
  scenarioId: string | null;
  bag: string[]; // product ids
}

export const INITIAL: AppState = {
  skin: null,
  trip: { origin: null, destination: null, startDate: "", days: 4, transport: ["plane"], activities: [], notes: "" },
  originClimate: null,
  climate: null,
  plan: null,
  scenarioId: null,
  bag: [],
};

const KEY = "skinpassport:v2";
let state: AppState = INITIAL;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) state = { ...INITIAL, ...JSON.parse(raw) };
  } catch {
    state = INITIAL;
  }
}

export function setApp(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  load();
  state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage may be unavailable (private mode) — state still lives in memory */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => {
  load();
  return state;
};

export const useApp = () => useSyncExternalStore(subscribe, getSnapshot, () => INITIAL);

export const toggleBag = (id: string) => setApp((s) => ({ bag: s.bag.includes(id) ? s.bag.filter((x) => x !== id) : [...s.bag, id] }));
export const addToBag = (ids: string[]) => setApp((s) => ({ bag: Array.from(new Set([...s.bag, ...ids])) }));
