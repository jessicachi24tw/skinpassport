import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import AppNav from "@/components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkinPassport",
  description: "Geo-adaptive skincare coach: your skin scan + your destination's climate = the right travel kit.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#1f2a44" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <div className="app-main">{children}</div>
        <Suspense fallback={null}>
          <AppNav />
        </Suspense>
      </body>
    </html>
  );
}
