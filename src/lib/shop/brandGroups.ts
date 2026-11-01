// Parent groups of common skincare brands (public acquisitions, checked October 2026).
// Used for ranking: the exact brand a user already uses gets the most points,
// another brand from the same group gets fewer points.
// Sources: company press releases, e.g. Estée Lauder completed DECIEM (The Ordinary) in 2024,
// L'Oréal took a majority stake in Medik8 in 2025, Unilever bought Paula's Choice in 2021.

export const BRAND_GROUPS: Record<string, string[]> = {
  "L'Oréal Groupe": [
    "L'Oréal Paris",
    "Garnier",
    "Maybelline",
    "NYX",
    "CeraVe",
    "La Roche-Posay",
    "Vichy",
    "SkinCeuticals",
    "Skinbetter Science",
    "Kiehl's",
    "Lancôme",
    "Youth to the People",
    "IT Cosmetics",
    "Biotherm",
    "Helena Rubinstein",
    "Aesop",
    "Medik8",
    "Takami",
    "Dr.G",
    "YSL Beauty",
    "Armani Beauty",
    "Valentino Beauty",
    "Prada Beauty",
    "Shu Uemura",
    "Urban Decay",
  ],
  "The Estée Lauder Companies": [
    "Estée Lauder",
    "Clinique",
    "La Mer",
    "Origins",
    "Bobbi Brown",
    "MAC",
    "Aveda",
    "Dr. Jart+",
    "The Ordinary",
    "NIOD",
    "Too Faced",
    "Smashbox",
    "Tom Ford Beauty",
    "Le Labo",
    "Jo Malone London",
    "Balm Dotcom",
  ],
  "Shiseido Group": ["Shiseido", "Clé de Peau Beauté", "Elixir", "Anessa", "NARS", "Drunk Elephant", "Dr. Dennis Gross"],
  Unilever: ["Dove", "Paula's Choice", "Tatcha", "Dermalogica", "Murad", "Hourglass", "Kate Somerville", "Living Proof", "Pond's", "Vaseline"],
  "Procter & Gamble": ["Olay", "SK-II", "First Aid Beauty", "Tula", "Native"],
  Kenvue: ["Neutrogena", "Aveeno", "Clean & Clear", "Dr.Ci:Labo"],
  Beiersdorf: ["Nivea", "Eucerin", "Aquaphor", "La Prairie", "Chantecaille"],
  Galderma: ["Cetaphil", "Differin", "Alastin"],
  "Pierre Fabre": ["Avène", "Ducray", "Klorane", "A-Derma"],
  Amorepacific: ["Laneige", "Sulwhasoo", "Innisfree", "Etude", "COSRX", "Aestura"],
  Edgewell: ["Sun Bum", "Banana Boat", "Hawaiian Tropic"],
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

const INDEX = new Map<string, string>();
for (const [group, brands] of Object.entries(BRAND_GROUPS)) for (const b of brands) INDEX.set(norm(b), group);

/** Parent group of a brand, or null if unknown. "Loreal Paris", "L'OREAL PARIS" and "L'Oréal Paris" all match. */
export function groupOf(brand: string): string | null {
  return INDEX.get(norm(brand)) ?? null;
}

export const sameBrand = (a: string, b: string) => norm(a) === norm(b);
