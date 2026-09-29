/**
 * Open Food Facts. Free, public, no API key — which is why the lookup runs on
 * the server: nothing about it needs to be in the browser, and OFF asks for an
 * identifying User-Agent.
 *
 * Two endpoints, and only two, both checked against the live API:
 *   - barcode:  world.openfoodfacts.org/api/v2/product/<code>.json
 *   - search:   search.openfoodfacts.org/search  ("search-a-licious")
 * The old cgi/search.pl returns 503 and is not used.
 *
 * Coverage of US packaged goods is patchy. A miss is normal, not an error, and
 * the scanner screen treats it as a first-class path: type the macros once and
 * the barcode is yours from then on.
 */

const UA = "FoodLog/1.0 (personal food tracker; vladimirbrusov83@gmail.com)";

export type OffProduct = {
  barcode: string;
  name: string;
  brand: string | null;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number | null;
  /** From OFF's free-text serving_size, when a gram number can be read out. */
  servingGrams: number | null;
  /** The label's own name for that serving: "1 container", else "1 serving". */
  servingLabel: string;
};

/** Volume and imperial words; a serving named in them is just "1 serving". */
const VOLUME = /\b(cups?|oz|onz|oza|ozs|ounces?|fl|lbs?|pints?|quarts?|gallons?|tbsp|tablespoons?|tsp|teaspoons?|ml|l)\b/i;

/** "1 container (170g)" → "1 container". Anything else — "2/3 cup (170g)",
 *  "6 onz", "11 crackers" — is just "1 serving"; the grams carry the meaning. */
export function parseServingLabel(text: string | undefined): string {
  const before = String(text ?? "").split("(")[0].replace(/\d+(?:[.,]\d+)?\s*(g|ml)\b/gi, "").trim().toLowerCase();
  if (!before || VOLUME.test(before) || /["″/]/.test(before)) return "1 serving";
  const m = before.match(/^(?:1\s+)?([a-z][a-z ]{1,20})$/);
  if (!m || /\b(serving|portion|unit|size)\b/.test(m[1])) return "1 serving";
  return `1 ${m[1].trim()}`;
}

type Nutriments = Record<string, number | string | undefined>;

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** "1 serving (28 g)" / "30g" / "2 oz (56g)" → 28, 30, 56. */
export function parseServingGrams(text: string | undefined): number | null {
  if (!text) return null;
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
  if (!m) return null;
  const grams = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(grams) && grams > 0 && grams < 2000 ? grams : null;
}

function toProduct(barcode: string, p: Record<string, unknown>): OffProduct | null {
  const n = (p.nutriments ?? {}) as Nutriments;

  // Some products carry only kilojoules. 4.184 kJ to the kcal.
  let kcal = num(n["energy-kcal_100g"]);
  if (kcal === null) {
    const kj = num(n["energy-kj_100g"]) ?? num(n["energy_100g"]);
    if (kj !== null) kcal = kj / 4.184;
  }
  const protein = num(n["proteins_100g"]);
  const carb = num(n["carbohydrates_100g"]);
  const fat = num(n["fat_100g"]);
  // No energy or no macros means the OFF entry is a stub. Better to hand him
  // the manual form than to log a food that is silently 0 kcal.
  if (kcal === null || protein === null || carb === null || fat === null) return null;

  const name = text(p.product_name) || text(p.generic_name);
  if (!name) return null;

  return {
    barcode,
    name,
    // The two endpoints disagree: the product API sends brands as "A,B", the
    // search API as ["A","B"]. Either way he wants the first one.
    brand: (Array.isArray(p.brands) ? text(p.brands[0]) : text(p.brands).split(",")[0].trim()) || null,
    kcal: Math.round(kcal),
    protein, carb, fat,
    fiber: num(n["fiber_100g"]),   // null, not 0, when OFF doesn't know
    servingGrams: num(p.serving_quantity) ?? parseServingGrams(p.serving_size as string | undefined),
    servingLabel: parseServingLabel(p.serving_size as string | undefined),
  };
}

/** null when OFF has never heard of the barcode, or has nothing usable on it. */
export async function lookupBarcode(barcode: string): Promise<OffProduct | null> {
  const fields = "product_name,generic_name,brands,nutriments,serving_size,serving_quantity";
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${fields}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { status?: number; product?: Record<string, unknown> };
    if (body.status !== 1 || !body.product) return null;
    return toProduct(barcode, body.product);
  } catch {
    // Offline, or OFF is down. The bundled library and My Foods still work.
    return null;
  }
}

/** Packaged foods by name. The bundled USDA library is searched first. */
export async function searchProducts(query: string, limit = 15): Promise<OffProduct[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}` +
    `&page_size=${limit}&fields=code,product_name,brands,nutriments,serving_size`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
    if (!res.ok) return [];
    const body = (await res.json()) as { hits?: Record<string, unknown>[] };
    return (body.hits ?? [])
      .map((h) => toProduct(String(h.code ?? ""), h))
      .filter((p): p is OffProduct => p !== null && p.barcode !== "");
  } catch {
    return [];
  }
}
