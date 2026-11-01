"use client";
// Main navigation: a bottom bar on phones, a left side rail on wide screens.
// Hidden on the landing page ("/") and the 4-step trip flow ("/trip").

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePassports } from "@/lib/passports";
import { useApp } from "@/lib/store";

const ICONS = {
  passport: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M9 16h6" />
    </>
  ),
  skin: (
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <circle cx="9.5" cy="10.5" r="0.8" />
      <circle cx="14.5" cy="10.5" r="0.8" />
      <path d="M9.5 14.5c1.4 1.2 3.6 1.2 5 0" />
    </>
  ),
  cart: (
    <>
      <path d="M6 8h12l-1 12H7L6 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
};

const TABS = [
  { href: "/profile", label: "My SkinPassport", icon: ICONS.passport, match: (p: string) => p.startsWith("/profile") || p.startsWith("/plan") },
  { href: "/skin", label: "Skin Analysis", icon: ICONS.skin, match: (p: string) => p.startsWith("/skin") },
  { href: "/cart", label: "Shopping Cart", icon: ICONS.cart, match: (p: string) => p.startsWith("/cart") || p.startsWith("/product") },
];

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function AppNav() {
  const path = usePathname();
  const app = useApp();
  const passports = usePassports();
  if (path === "/" || path.startsWith("/trip")) return null;
  // Cart badge: the most recent passport's bag (the open one if it is the latest).
  const latest = passports?.[0];
  const count = latest ? (app.currentPassportId === latest.id ? app.bag.length : latest.snapshot.bag.length) : 0;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-3 gap-1 border-t border-line bg-white px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 lg:inset-y-0 lg:left-0 lg:right-auto lg:flex lg:h-auto lg:w-60 lg:flex-col lg:gap-1.5 lg:border-r lg:border-t-0 lg:px-4 lg:py-7"
    >
      <Link href="/profile" className="mb-5 hidden px-3 font-display text-2xl lg:block">
        SkinPassport
      </Link>
      {TABS.map((t) => {
        const active = t.match(path);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] transition lg:h-12 lg:flex-row lg:justify-start lg:gap-3 lg:px-3.5 lg:text-sm ${
              active ? "bg-ink font-bold text-paper" : "font-semibold text-ink-soft hover:bg-paper hover:text-ink"
            }`}
          >
            <Icon>{t.icon}</Icon>
            {t.label}
            {t.href === "/cart" && count > 0 && (
              <span className="absolute left-[calc(50%+6px)] top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral px-1.5 text-[10px] font-bold text-white lg:static lg:ml-auto lg:h-[22px] lg:min-w-[22px] lg:text-[11px]">
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
