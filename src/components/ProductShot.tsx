// Product visual: the background-removed Open Beauty Facts photo when we have one,
// otherwise an illustrated pack shot (shape follows texture, colour follows brand).
import Image from "next/image";
import type { Product } from "@/lib/types";

const BRAND_COLORS: Record<string, [string, string]> = {
  "La Roche-Posay": ["#ffffff", "#2a6fb3"],
  CeraVe: ["#ffffff", "#1f5aa6"],
  "Bioré": ["#e7f4fb", "#1b8fd0"],
  EltaMD: ["#ffffff", "#2b8f6f"],
  "Kiehl's": ["#f3efe6", "#3a3a3a"],
  "The Ordinary": ["#f6f6f2", "#222222"],
  Neutrogena: ["#e5f0fb", "#2f6fd1"],
  Clinique: ["#e8f4f1", "#5aa89a"],
  "Dr. Jart+": ["#e8f3ec", "#3c8a5c"],
  "L'Oréal Paris": ["#fff4e0", "#c98a10"],
  "Sun Bum": ["#fff3c4", "#e0942a"],
  Aquaphor: ["#eef3fb", "#1e4a9a"],
  Laneige: ["#fce6ef", "#c94f86"],
  "Avène": ["#f2f7fb", "#e2546b"],
  Vanicream: ["#ffffff", "#2d6db5"],
  "First Aid Beauty": ["#ffffff", "#c2283a"],
  Vichy: ["#ffffff", "#1d4f91"],
  belif: ["#eef5fb", "#2e5c8a"],
  Tatcha: ["#f6f0f5", "#7a2a55"],
  Garnier: ["#fff6dd", "#e08a00"],
  SkinCeuticals: ["#f4f4f4", "#1f1f1f"],
  Clarins: ["#fff6f5", "#b3122e"],
  fresh: ["#fbf7ef", "#8a6a3c"],
  "Mario Badescu": ["#fbeff1", "#b04a64"],
  Caudalie: ["#f8f1ea", "#7c5a3c"],
  Shiseido: ["#fdf3f3", "#c4161c"],
  "Supergoop!": ["#fff7e0", "#e88b1a"],
};

/** Premium cut-out photo on a soft, brand-tinted backdrop. */
function PhotoShot({ product, size, accent }: { product: Product; size: number; accent: string }) {
  return (
    <div className="relative shrink-0 overflow-hidden rounded-[22%]" style={{ width: size, height: size, background: `radial-gradient(circle at 50% 38%, #ffffff 0%, ${accent}14 70%, ${accent}24 100%)` }}>
      <div className="absolute inset-x-[22%] bottom-[9%] h-[6%] rounded-[50%] bg-ink/15 blur-[3px]" aria-hidden />
      <Image
        src={product.image!.src}
        alt={`${product.brand} ${product.name}`}
        fill
        sizes={`${size}px`}
        className="object-contain p-[9%] drop-shadow-[0_6px_10px_rgba(31,42,68,0.18)]"
      />
    </div>
  );
}

export default function ProductShot({ product, size = 120 }: { product: Product; size?: number }) {
  const [body, accent] = BRAND_COLORS[product.brand] ?? ["#ffffff", "#1f2a44"];
  if (product.image) return <PhotoShot product={product} size={size} accent={accent} />;
  const t = product.texture ?? "light";
  const SHORT: Record<string, string> = { "La Roche-Posay": "LRP", "The Ordinary": "ORDINARY", "L'Oréal Paris": "L'ORÉAL", "Dr. Jart+": "DR.JART+" };
  const label = SHORT[product.brand] ?? product.brand.slice(0, 10);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden className="shrink-0">
      <rect width="120" height="120" rx="20" fill={accent} opacity="0.1" />
      <ellipse cx="60" cy="104" rx="30" ry="4" fill="#1f2a44" opacity="0.12" />
      {t === "rich" && (
        <g>
          <rect x="28" y="56" width="64" height="44" rx="8" fill={body} stroke={accent} strokeWidth="1.5" />
          <rect x="25" y="44" width="70" height="16" rx="5" fill={accent} />
          <rect x="34" y="72" width="52" height="3" rx="1.5" fill={accent} opacity="0.5" />
        </g>
      )}
      {t === "balm" && (
        <g>
          <path d="M44 22h32v8l-4 70H48l-4-70z" fill={body} stroke={accent} strokeWidth="1.5" />
          <rect x="46" y="98" width="28" height="8" rx="2" fill={accent} />
          <rect x="50" y="18" width="20" height="6" rx="2" fill={accent} opacity="0.7" />
        </g>
      )}
      {t === "spray" && (
        <g>
          <rect x="42" y="36" width="36" height="66" rx="10" fill={body} stroke={accent} strokeWidth="1.5" />
          <rect x="50" y="22" width="20" height="16" rx="3" fill={accent} />
          <rect x="68" y="26" width="8" height="4" rx="1" fill={accent} />
          <circle cx="86" cy="26" r="1.5" fill={accent} opacity="0.5" />
          <circle cx="92" cy="22" r="1.2" fill={accent} opacity="0.35" />
          <circle cx="92" cy="30" r="1" fill={accent} opacity="0.35" />
        </g>
      )}
      {t === "gel" && (
        <g>
          <rect x="30" y="54" width="60" height="46" rx="14" fill={body} stroke={accent} strokeWidth="1.5" />
          <rect x="34" y="44" width="52" height="14" rx="6" fill={accent} />
          <circle cx="60" cy="78" r="9" fill={accent} opacity="0.18" />
        </g>
      )}
      {t === "light" && (
        <g>
          <path d="M42 30h36l-2 62a6 6 0 0 1-6 6H50a6 6 0 0 1-6-6z" fill={body} stroke={accent} strokeWidth="1.5" />
          <rect x="47" y="14" width="26" height="18" rx="4" fill={accent} />
          {product.spf && (
            <text x="60" y="84" textAnchor="middle" fontSize="10" fontWeight="700" fill={accent}>
              SPF {product.spf}
            </text>
          )}
        </g>
      )}
      <text x="60" y={t === "rich" || t === "gel" ? 92 : t === "spray" ? 62 : 54} textAnchor="middle" fontSize="8.5" fontWeight="700" fill={accent} letterSpacing="0.3">
        {label.toUpperCase()}
      </text>
    </svg>
  );
}
