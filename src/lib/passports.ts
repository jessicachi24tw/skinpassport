"use client";
// My SkinPassports: every finished plan is saved on this device (IndexedDB), never on a server.
// A passport is a snapshot of the plan (scan, trip, weather, picks, bag, simulation) plus
// the products the user checked against it.

import { useEffect, useState } from "react";
import type { FoundProduct } from "./engine/productCheck";
import { INITIAL, setApp, type AppState } from "./store";
import type { NeedId } from "./types";

export type Snapshot = Pick<
  AppState,
  "trip" | "climate" | "originClimate" | "skin" | "photo" | "photoMirrored" | "shelf" | "plan" | "budget" | "bag" | "ownedNeeds" | "simulation" | "customProducts"
>;

export interface SavedCheck {
  id: string;
  at: number;
  query: string;
  found: FoundProduct;
  catalogId?: string;
  type: NeedId;
}

export interface Passport {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  snapshot: Snapshot;
  checks: SavedCheck[];
}

const DB = "skinpassport";
const STORE = "passports";
const EVENT = "skinpassport:passports";

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = run(d.transaction(STORE, mode).objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

const changed = () => window.dispatchEvent(new Event(EVENT));

export async function listPassports(): Promise<Passport[]> {
  try {
    const all = await tx<Passport[]>("readonly", (s) => s.getAll() as IDBRequest<Passport[]>);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export const getPassport = (id: string) => tx<Passport | undefined>("readonly", (s) => s.get(id) as IDBRequest<Passport | undefined>);

export async function putPassport(p: Passport) {
  await tx("readwrite", (s) => s.put(p));
  changed();
}

export async function deletePassport(id: string) {
  await tx("readwrite", (s) => s.delete(id));
  changed();
}

export const snapshotOf = (a: AppState): Snapshot => ({
  trip: a.trip,
  climate: a.climate,
  originClimate: a.originClimate,
  skin: a.skin,
  photo: a.photo,
  photoMirrored: a.photoMirrored,
  shelf: a.shelf,
  plan: a.plan,
  budget: a.budget,
  bag: a.bag,
  ownedNeeds: a.ownedNeeds,
  simulation: a.simulation,
  customProducts: a.customProducts,
});

/** Default name: scan date · destination, e.g. "Oct 30, 2026 · New York". */
export function defaultName(destination: string | undefined, at = Date.now()) {
  const date = new Date(at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${date} · ${destination ?? "Trip"}`;
}

/** Save a new passport for the plan that was just generated. Returns its id. */
export async function createPassport(a: AppState): Promise<string | null> {
  try {
    const now = Date.now();
    const id = `p-${now}`;
    await putPassport({ id, name: defaultName(a.trip.destination?.name, now), createdAt: now, updatedAt: now, snapshot: snapshotOf(a), checks: [] });
    return id;
  } catch {
    return null; // private mode / storage blocked: the plan still works, it just isn't saved
  }
}

/** Open a saved passport: it becomes the current (locked) plan. */
export function openPassport(p: Passport) {
  setApp({ ...INITIAL, ...p.snapshot, step: "results", currentPassportId: p.id });
}

export function usePassports() {
  const [list, setList] = useState<Passport[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => listPassports().then((l) => alive && setList(l));
    load();
    window.addEventListener(EVENT, load);
    return () => {
      alive = false;
      window.removeEventListener(EVENT, load);
    };
  }, []);
  return list;
}

/** Keeps the open passport in sync with the plan (bag, budget, ticks, simulation). */
export function usePassportAutosave(a: AppState) {
  const snap = a.currentPassportId && a.plan ? JSON.stringify([a.bag, a.budget, a.ownedNeeds, a.simulation?.key, a.customProducts.length]) : null;
  useEffect(() => {
    if (!snap || !a.currentPassportId) return;
    const id = a.currentPassportId;
    const t = setTimeout(async () => {
      try {
        const p = await getPassport(id);
        if (p) await putPassport({ ...p, updatedAt: Date.now(), snapshot: snapshotOf(a) });
      } catch {
        /* storage unavailable */
      }
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap]);
}
