"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { COUNTRIES, flag, placeLabel, searchCountries, searchLocalCities } from "@/lib/places";
import type { Country, Place } from "@/lib/types";

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <b className="text-coral">{text.slice(i, i + q.length)}</b>
      {text.slice(i + q.length)}
    </>
  );
}

/** Accessible autocomplete input with keyboard navigation. */
function Combobox<T>({
  placeholder,
  items,
  query,
  setQuery,
  onSelect,
  render,
  getKey,
  disabled,
  loading,
  autoFocus,
  icon,
}: {
  placeholder: string;
  items: T[];
  query: string;
  setQuery: (q: string) => void;
  onSelect: (t: T) => void;
  render: (t: T, q: string) => ReactNode;
  getKey: (t: T) => string;
  disabled?: boolean;
  loading?: boolean;
  autoFocus?: boolean;
  icon?: ReactNode;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const show = open && query.length > 0 && (items.length > 0 || loading);

  const choose = (t: T) => {
    onSelect(t);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-ink">
        {icon}
        <input
          role="combobox"
          aria-expanded={!!show}
          aria-controls={`${id}-list`}
          aria-activedescendant={show ? `${id}-${active}` : undefined}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          className="w-full bg-transparent py-2.5 text-sm outline-none disabled:cursor-not-allowed"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (!show) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && items[active]) {
              e.preventDefault();
              choose(items[active]);
            } else if (e.key === "Escape") setOpen(false);
          }}
        />
        {loading && <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-ink/20 border-t-ink" aria-label="Searching" />}
      </div>
      {show && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-line bg-white py-1 shadow-lg">
          {items.map((t, i) => (
            <li
              key={getKey(t)}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(t);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-paper" : ""}`}
            >
              {render(t, query)}
            </li>
          ))}
          {!items.length && loading && <li className="px-3 py-2 text-sm text-ink-soft">Searching…</li>}
        </ul>
      )}
    </div>
  );
}

/** City search: instant local matches, then live geocoding results. */
function useCitySearch(q: string, countryCode: string) {
  const [remote, setRemote] = useState<{ key: string; places: Place[] } | null>(null);
  const key = `${countryCode}|${q.trim().toLowerCase()}`;
  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/places?q=${encodeURIComponent(query)}&country=${countryCode}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setRemote({ key, places: d.places ?? [] }))
        .catch(() => {});
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, countryCode, key]);
  const local = q.trim() ? searchLocalCities(q, countryCode).slice(0, 6) : [];
  const fresh = remote?.key === key ? remote.places : null;
  const places = fresh ?? local;
  return { places, loading: q.trim().length >= 2 && !fresh };
}

export default function LocationPicker({
  label,
  value,
  onChange,
  disabled,
  extra,
}: {
  label: string;
  value: Place | null;
  onChange: (p: Place | null) => void;
  disabled?: boolean;
  extra?: ReactNode;
}) {
  const [country, setCountry] = useState<Country | null>(() => (value ? (COUNTRIES.find((c) => c.code === value.countryCode) ?? null) : null));
  const [countryQ, setCountryQ] = useState("");
  const [cityQ, setCityQ] = useState("");
  const { places, loading } = useCitySearch(country ? cityQ : "", country?.code ?? "");
  const cityRef = useRef<HTMLDivElement>(null);

  // Selected: show a compact chip with a "change" action.
  if (value) {
    return (
      <div>
        <p className="mb-1 text-xs text-ink-soft">{label}</p>
        <div className="flex items-center gap-3 rounded-xl border border-ink/15 bg-paper px-3 py-2.5">
          <span className="text-xl leading-none">{value.countryCode ? flag(value.countryCode) : "📍"}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{value.name}</p>
            <p className="truncate text-xs text-ink-soft">{[value.admin1 !== value.name ? value.admin1 : null, value.country].filter(Boolean).join(", ")}</p>
          </div>
          <button
            disabled={disabled}
            onClick={() => {
              setCountry(COUNTRIES.find((c) => c.code === value.countryCode) ?? null);
              onChange(null);
              setCityQ("");
            }}
            className="text-xs font-semibold text-coral hover:underline"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs text-ink-soft">{label}</p>
        {extra}
      </div>
      <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2">
        {country ? (
          <button
            disabled={disabled}
            onClick={() => {
              setCountry(null);
              setCountryQ("");
            }}
            className="flex items-center gap-2 truncate rounded-xl border border-line bg-white px-3 py-2.5 text-left text-sm"
            title="Change country"
          >
            <span className="text-lg leading-none">{flag(country.code)}</span>
            <span className="truncate">{country.name}</span>
          </button>
        ) : (
          <Combobox<Country>
            placeholder="1. Country"
            items={searchCountries(countryQ).slice(0, 8)}
            query={countryQ}
            setQuery={setCountryQ}
            disabled={disabled}
            getKey={(c) => c.code}
            onSelect={(c) => {
              setCountry(c);
              setCountryQ("");
              setTimeout(() => cityRef.current?.querySelector("input")?.focus(), 30);
            }}
            render={(c, q) => (
              <span className="flex items-center gap-2">
                <span className="text-lg leading-none">{flag(c.code)}</span>
                <span>
                  <Highlight text={c.name} q={q} />
                </span>
              </span>
            )}
          />
        )}
        <div ref={cityRef}>
          <Combobox<Place>
            placeholder={country ? "2. City" : "Pick country first"}
            items={places}
            loading={loading}
            query={cityQ}
            setQuery={setCityQ}
            disabled={disabled || !country}
            getKey={(p) => p.id}
            onSelect={(p) => onChange({ ...p, countryCode: p.countryCode || country!.code, country: p.country || country!.name })}
            render={(p, q) => (
              <span className="block">
                <span className="block font-medium">
                  <Highlight text={p.name} q={q} />
                </span>
                <span className="block text-xs text-ink-soft">{placeLabel(p).split(", ").slice(1).join(", ")}</span>
              </span>
            )}
          />
        </div>
      </div>
    </div>
  );
}
