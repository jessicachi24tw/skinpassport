// Tiny client-side store shared by every page (home, product pages, action plan).
// It survives navigation and page refreshes (sessionStorage) without a server.

import { useSyncExternalStore } from "react";
import type { BudgetTier, Climate, NeedId, OwnedProduct, PlanResult, SkinProfile, TripInput } from "./types";

export type Step = "trip" | "scan" | "shelf" | "results";

export interface AppState {
  step: Step;
  trip: TripInput;
  scenarioId: string | null;
  climate: Climate | null;
  originClimate: Climate | null;
  skin: SkinProfile | null;
  photo: string | null; // scanned selfie (data URL), shown with YouCam masks
  photoMirrored: boolean; // camera selfies are shown mirrored
  shelf: OwnedProduct[]; // products the user already uses (Step 3)
  plan: PlanResult | null;
  budget: BudgetTier;
  bag: string[]; // product ids the user chose to buy
  ownedNeeds: NeedId[]; // "I already have this" ticks
}

export const INITIAL: AppState = {
  step: "trip",
  trip: { origin: null, destination: null, startDate: "", days: 4, transport: ["plane"], activities: [], notes: "" },
  scenarioId: null,
  climate: null,
  originClimate: null,
  skin: null,
  photo: null,
  photoMirrored: false,
  shelf: [],
  plan: null,
  budget: "balanced",
  bag: [],
  ownedNeeds: [],
};

const KEY = "skinpassport:v4";
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
    // Storage full or unavailable: keep everything except the photo, state still lives in memory.
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify({ ...state, photo: null }));
    } catch {
      /* private mode */
    }
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
export const toggleOwnedNeed = (id: NeedId) =>
  setApp((s) => ({ ownedNeeds: s.ownedNeeds.includes(id) ? s.ownedNeeds.filter((x) => x !== id) : [...s.ownedNeeds, id] }));
export const resetAll = () => setApp({ ...INITIAL });
