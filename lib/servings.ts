/**
 * Portion names. He logs in grams or in servings, never in cups, spoons or
 * ounces, so volume and imperial measures are dropped and what is left is
 * tidied into something like "1 slice" or "1 large".
 */

/** First word of a label that marks it as volume or imperial. */
const DROP = new Set([
  "cup", "cups", "oz", "fl", "lb", "lbs", "pint", "quart", "gallon",
  "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons", "package",
]);

/** "1 slice" for a label worth showing, null for one that isn't. */
export function cleanServingLabel(label: string): string | null {
  // Parentheticals carry inches ('medium (2-3/4" dia)') or repeat the obvious.
  let s = label.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const count = s.match(/^(\d+(?:[./]\d+)?)\s+/);
  const rest = count ? s.slice(count[0].length) : s;
  const unit = rest.split(/[\s,]/)[0]?.toLowerCase() ?? "";
  if (!unit || DROP.has(unit) || /["″]|\binch|\bdia\b/i.test(rest)) return null;
  // "serving 1/2 cup" is a serving; what follows is the label restating it in cups.
  if (unit === "serving") return "1 serving";
  if (rest.split(/\s+/).some((w) => DROP.has(w.toLowerCase()))) return null;
  // "breast, bone and skin removed" → "breast"; the detail after a comma is USDA prep notes.
  let name = rest.split(",")[0].trim();
  const n = count ? count[1] : "1";
  if (n === "1") name = name.replace(/^(slice|clove|piece|link)s\b/i, "$1");
  return `${n} ${name}`;
}

export function usableServings<T extends { label: string }>(list: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const s of list) {
    const label = cleanServingLabel(s.label);
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push({ ...s, label });
  }
  return out;
}

/** Quantities like 0.5, 1, 1.5 — never "1.5000001". */
export const qtyText = (n: number) => String(Math.round(n * 100) / 100);

/** How an entry reads in a list: "2 × slice · 56 g", or just "150 g". */
export function portionText(p: { grams: number; servingLabel: string | null; servingQty: number | null }): string {
  const grams = `${Math.round(p.grams * 10) / 10} g`;
  if (!p.servingLabel || !p.servingQty) return grams;
  const unit = p.servingLabel.replace(/^1\s+/, "");
  const lead = p.servingQty === 1 && /^1\s/.test(p.servingLabel) ? p.servingLabel : `${qtyText(p.servingQty)} × ${unit}`;
  return `${lead} · ${grams}`;
}
