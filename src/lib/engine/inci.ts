// Turn any ingredient list (INCI text) + product name into what our engine understands:
// known ingredients, stated percentages, SPF, fragrance, and the likely product type.
// Pure and deterministic: the AI lookup only finds the text, this decides what it contains.

import type { IngredientId, NeedId, StatedConcentration, Texture } from "../types";

/** INCI names and common synonyms for each ingredient we can explain. Order matters for LHA vs salicylic acid. */
const SYNONYMS: [IngredientId, RegExp][] = [
  ["lha", /capryloyl salicylic acid|\blha\b/i],
  ["salicylic_acid", /(?<!capryloyl )salicylic acid|\bbha\b|betaine salicylate/i],
  ["hyaluronic_acid", /hyalur/i],
  ["ceramides", /ceramide/i],
  ["glycerin", /\bglycerin\b|\bglycerol\b/i],
  ["squalane", /squalane/i],
  ["panthenol", /panthenol|pantothenic/i],
  ["centella", /centella|madecassoside|asiaticoside|madecassic|\bcica\b/i],
  ["niacinamide", /niacinamide|nicotinamide/i],
  ["vitamin_c", /ascorbic acid|ascorbyl|ascorbate|vitamin c\b/i],
  ["tranexamic_acid", /tranexamic/i],
  ["kojic_acid", /kojic/i],
  ["melasyl", /mercaptonicotinoyl glycine|melasyl/i],
  ["vitamin_e", /tocopher/i],
  ["ferulic_acid", /ferulic/i],
  ["shea_butter", /butyrospermum|shea butter/i],
  ["petrolatum", /petrolatum|petroleum jelly/i],
  ["cholesterol", /\bcholesterol\b/i],
  ["peptides", /peptide|matrixyl|argireline/i],
  ["retinoid", /retinol|retinal\b|retinaldehyde|retinyl|retinoate|adapalene/i],
  ["zinc_oxide", /zinc oxide/i],
  ["uv_filters", /avobenzone|octocrylene|homosalate|octisalate|oxybenzone|ethylhexyl methoxycinnamate|ethylhexyl triazone|bis-ethylhexyloxyphenol|methylene bis-benzotriazolyl|diethylhexyl butamido|drometrizole|terephthalylidene|tinosorb|uvinul|titanium dioxide/i],
  ["cucumber", /cucumis sativus|cucumber/i],
  ["aloe", /aloe barbadensis|aloe vera/i],
  ["thermal_water", /thermal spring water|eau thermale|thermal water/i],
  ["bisabolol", /bisabolol/i],
  ["benzoyl_peroxide", /benzoyl peroxide/i],
  ["glycolic_acid", /glycolic acid/i],
  ["zinc", /zinc pca|zinc gluconate/i],
];

export interface ParsedIngredients {
  ingredients: IngredientId[];
  fragrance: boolean;
  /** Drying alcohol (alcohol denat. / SD alcohol) in the list. */
  alcohol: boolean;
  /** Number of INCI entries we could read. */
  count: number;
}

/** Split an INCI list and find the ingredients we know, in list order. */
export function parseInci(text: string): ParsedIngredients {
  const clean = text.replace(/\*+|\[.*?\]|\(.*?may contain.*?\)/gi, " ");
  const parts = clean
    .split(/[,;•\n]|\.\s/)
    .map((p) => p.trim())
    .filter((p) => p.length > 1);
  const found: IngredientId[] = [];
  for (const part of parts) {
    for (const [id, re] of SYNONYMS) {
      if (re.test(part) && !found.includes(id)) {
        found.push(id);
        break;
      }
    }
  }
  return {
    ingredients: found,
    fragrance: /\bparfum\b|\bfragrance\b|\baroma\b|linalool|limonene|citronellol|geraniol/i.test(clean),
    alcohol: /alcohol denat|sd alcohol|ethanol\b/i.test(clean),
    count: parts.length,
  };
}

const PCT = /(\d+(?:[.,]\d+)?)\s?%/g;

/** Percentages stated in the product name or claims, e.g. "10% Niacinamide" or "Retinol 0.3%". */
export function statedPercentages(text: string): StatedConcentration[] {
  const out: StatedConcentration[] = [];
  for (const m of text.matchAll(PCT)) {
    const pct = Number(m[1].replace(",", "."));
    if (!(pct > 0 && pct <= 40)) continue;
    // Look at the words right after (or before) the number.
    const after = text.slice(m.index! + m[0].length, m.index! + m[0].length + 40);
    const before = text.slice(Math.max(0, m.index! - 30), m.index!);
    const match = (s: string) => SYNONYMS.find(([, re]) => re.test(s))?.[0] ?? (/\bzinc\b(?! oxide)/i.test(s) ? "zinc" : undefined);
    const id = match(after.split(/[+&,]/)[0]) ?? match(before.split(/[+&,]/).pop() ?? "");
    if (id && !out.some((c) => c.ingredient === id)) out.push({ ingredient: id, pct });
  }
  return out;
}

export const parseSpf = (text: string) => {
  const m = /spf\s*(\d{2,3})/i.exec(text);
  return m ? Number(m[1]) : undefined;
};

/** Likely product type(s), best first, from the name and what's inside. */
export function guessTypes(name: string, ing: IngredientId[]): NeedId[] {
  const n = name.toLowerCase();
  const out: NeedId[] = [];
  const add = (id: NeedId) => !out.includes(id) && out.push(id);
  if (parseSpf(name) || /sunscreen|sun screen|\buv\b|sun fluid|sun milk/.test(n)) add("sunscreen");
  if (/after[\s-]?sun/.test(n)) add("after_sun");
  if (/cleans|face wash|foaming|micellar|wash\b/.test(n)) add("gentle_cleanser");
  if (/\blip/.test(n)) add("lip_care");
  if (/toner|toning|tonique|clarifying (solution|lotion)/.test(n)) add("toner");
  if (/mist|spray|thermal water/.test(n)) add("face_mist");
  if (ing.includes("benzoyl_peroxide") || /spot|blemish|acne treatment|pimple/.test(n)) add("blemish_care");
  if (ing.includes("glycolic_acid") || /exfoli|peel|resurfac|\baha\b/.test(n)) add("exfoliant");
  if (/\bbha\b|salicylic/.test(n)) add("pore_serum");
  if (ing.includes("retinoid") || ing.includes("peptides") || /wrinkle|fine line|retinol|peptide/.test(n)) add("line_smoothing");
  if (/vitamin c|brighten|dark spot|discoloration|tranexamic/.test(n)) add("brightening");
  if (/niacinamide|pore/.test(n)) add("pore_serum");
  if (/cica|sooth|calm|redness|baume/.test(n)) add("soothing");
  if (/gel[\s-]?cream|water gel|oil[\s-]?free|jelly/.test(n)) add("gel_moisturizer");
  if (/serum|booster|essence|ampoule|hyaluronic/.test(n)) add("hydrating_serum");
  if (/cream|moistur|lotion|balm|ointment/.test(n)) add(ing.includes("ceramides") || /rich|repair|barrier/.test(n) ? "barrier_cream" : "gel_moisturizer");
  return out;
}

export function guessTexture(name: string): Texture | undefined {
  const n = name.toLowerCase();
  if (/balm|ointment|baume/.test(n)) return "balm";
  if (/gel|water|jelly/.test(n)) return "gel";
  if (/mist|spray/.test(n)) return "spray";
  if (/rich|cream|butter/.test(n)) return "rich";
  if (/serum|lotion|fluid|milk|essence/.test(n)) return "light";
  return undefined;
}
