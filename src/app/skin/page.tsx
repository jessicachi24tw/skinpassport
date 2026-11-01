import type { Metadata } from "next";
import SkinView from "@/components/SkinView";

export const metadata: Metadata = { title: "Skin Analysis · SkinPassport" };

export default function SkinPage() {
  return <SkinView />;
}
