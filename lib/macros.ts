/**
 * Portion math, in one place. Everything logged is grams; every stored macro is
 * per 100 g. Rounding happens once, at display, so a total is never the sum of
 * already-rounded parts.
 */
import type { Macros } from "./types";

/** What `grams` of a food is worth. Fiber stays null if the food's fiber is. */
export function forGrams(per100g: Macros, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: per100g.kcal * f,
    protein: per100g.protein * f,
    carb: per100g.carb * f,
    fat: per100g.fat * f,
    fiber: per100g.fiber === null ? null : per100g.fiber * f,
  };
}

/**
 * Adds portions up. Fiber is the awkward one: a single unknown makes the total
 * a floor, not a value, so the sum is reported alongside `fiberComplete`.
 * Do not "fix" the nulls to zero — that quietly invents fiber nobody ate.
 */
export type MacroTotal = Omit<Macros, "fiber"> & { fiber: number; fiberComplete: boolean };

export function sumMacros(parts: Macros[]): MacroTotal {
  const total = { kcal: 0, protein: 0, carb: 0, fat: 0, fiber: 0, fiberComplete: true };
  for (const p of parts) {
    total.kcal += p.kcal;
    total.protein += p.protein;
    total.carb += p.carb;
    total.fat += p.fat;
    if (p.fiber === null) total.fiberComplete = false;
    else total.fiber += p.fiber;
  }
  return total;
}

export const kcal = (n: number) => Math.round(n);
/** Macros to one decimal, but a whole number when it is one. */
export const g = (n: number) => (Math.round(n * 10) / 10).toString();

/** "12g" when every part knew its fiber, "12g+" when one didn't. */
export function fiberLabel(total: number, complete: boolean): string {
  return `${g(total)}g${complete ? "" : "+"}`;
}
