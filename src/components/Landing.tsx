"use client";
// Landing page: the 3D face, the name, one headline and Start.
// Returning users (who already have passports) go straight to My Passports.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePassports } from "@/lib/passports";
import { resetAll } from "@/lib/store";
import FaceHero from "./FaceHero";

export default function Landing() {
  const router = useRouter();
  const passports = usePassports();
  const returning = !!passports?.length;

  useEffect(() => {
    if (returning) router.replace("/profile");
  }, [returning, router]);

  // Wait for the device check so returning users never see a flash of the landing page.
  if (passports === null || returning) return <main className="fixed inset-0 bg-[#1f2a44]" />;

  return (
    <main
      // Fixed to the whole screen (including the notch and home-bar areas) so no paper-coloured edge shows.
      className="fixed inset-0 z-50 flex overflow-y-auto overflow-x-hidden px-7 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-paper lg:px-24"
      style={{ background: "radial-gradient(120% 75% at 50% 30%, #2a375a 0%, #1f2a44 55%, #161e33 100%)" }}
    >
      <div className="m-auto flex w-full max-w-6xl flex-col items-center lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:gap-10">
        {/* Face: first on phones, right column on wide screens */}
        <div className="animate-[floatY_7s_ease-in-out_infinite] lg:order-2">
          {/* Shrinks on short phones so the name, headline and Start always fit on one screen. */}
          <FaceHero className="h-[min(357px,48dvh)] w-[min(290px,calc(48dvh*0.812))] lg:h-[517px] lg:w-[420px]" />
        </div>

        <div className="flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
          {/* Phone: big name, small headline. Wide screen: small label, big two-line headline. */}
          <h1 className="mt-[min(2.75rem,5dvh)] font-display text-5xl leading-none tracking-tight lg:mt-0 lg:font-sans lg:text-[17px] lg:font-semibold lg:uppercase lg:tracking-[0.32em] lg:text-[#c9cede]">
            SkinPassport
          </h1>
          <p className="mt-3 text-sm tracking-wide text-[#c9cede] lg:mt-6 lg:whitespace-nowrap lg:font-display lg:text-[64px] lg:leading-[1.08] lg:tracking-tight lg:text-paper">
            Your skin,<br className="hidden lg:inline" /> cleared for every trip.
          </p>
          <Link
            href="/trip"
            onClick={() => resetAll()}
            className="mt-[min(2.75rem,5dvh)] flex h-[92px] w-[92px] animate-[startPulse_2.2s_ease-out_infinite] items-center justify-center rounded-full bg-coral text-sm font-bold uppercase tracking-[0.22em] text-white transition hover:bg-coral/90 lg:mt-14 lg:h-[104px] lg:w-[104px] lg:text-[15px]"
          >
            Start
          </Link>
        </div>
      </div>
    </main>
  );
}
