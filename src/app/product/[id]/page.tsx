import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductView from "@/components/ProductView";
import { alternativesFor, CATALOG, getProduct } from "@/lib/shop/catalog";

export function generateStaticParams() {
  return CATALOG.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = getProduct((await params).id);
  return { title: p ? `${p.brand} ${p.name} · SkinPassport` : "Product · SkinPassport", description: p?.tagline };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = getProduct((await params).id);
  if (!product) notFound();
  return <ProductView product={product} alternatives={alternativesFor(product)} />;
}
