"use client";

import { useState } from "react";
import { g } from "@/lib/macros";
import type { Food } from "@/lib/types";
import { Card, Icon, inputClass } from "./ui";

type Row = { key: number; label: string; grams: string };
let nextKey = 1;

/**
 * Create or edit a food — also the scanner's "not found" form, so there is one
 * way to describe a food everywhere. Labels in the US print nutrition per
 * serving, so the numbers can be typed per serving or per 100 g; the server
 * stores per 100 g either way.
 */
export function FoodForm(
  { action, hidden, food, submitLabel, nameAutoFocus = true, padBottom = true }:
  {
    action: (fd: FormData) => void | Promise<void>;
    hidden: Record<string, string | number>;
    food?: Food;
    submitLabel: string;
    nameAutoFocus?: boolean;
    /** Off when the page puts something under the form, such as Delete. */
    padBottom?: boolean;
  },
) {
  const [rows, setRows] = useState<Row[]>(() =>
    food?.servings.length
      ? food.servings.map((s) => ({ key: nextKey++, label: s.label, grams: g(s.grams) }))
      : [{ key: nextKey++, label: "", grams: "" }]);
  // Opens per 100 g, which is what is stored: opening per serving would round
  // at serving scale, and a Save that only renamed the food would shift its numbers.
  const [basis, setBasis] = useState<"100g" | "serving">("100g");
  const [vals, setVals] = useState<Record<Nutrient, string>>(() => {
    const v = (n: number | null | undefined) => (n === null || n === undefined ? "" : g(n));
    return { kcal: v(food?.kcal), protein: v(food?.protein), carb: v(food?.carb), fat: v(food?.fat), fiber: v(food?.fiber) };
  });

  const first = rows[0];
  const firstGrams = Number(first?.grams.replace(",", "."));
  const servingOk = !!first && Number.isFinite(firstGrams) && firstGrams > 0;
  const servingName = (first?.label.trim() || "1 serving");
  const effectiveBasis = basis === "serving" && servingOk ? "serving" : "100g";

  // Switching the basis converts what is already typed, so nothing has to be re-entered.
  function switchBasis(next: "100g" | "serving") {
    if (next === effectiveBasis || !servingOk) return;
    const f = next === "serving" ? firstGrams / 100 : 100 / firstGrams;
    setVals((vs) => Object.fromEntries(Object.entries(vs).map(([k, v]) => {
      const n = Number(v.replace(",", "."));
      return [k, v.trim() === "" || !Number.isFinite(n) ? v : g(n * f)];
    })) as Record<Nutrient, string>);
    setBasis(next);
  }

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <form action={action} className={`space-y-4 ${padBottom ? "pb-32" : ""}`}>
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="basis" value={effectiveBasis} />

      <Card className="space-y-3 p-5">
        <Field label="Name">
          <input name="name" required autoFocus={nameAutoFocus} defaultValue={food?.name}
                 placeholder="e.g. Greek yogurt 2%" className={inputClass} />
        </Field>
        <Field label="Brand" optional>
          <input name="brand" defaultValue={food?.brand ?? ""} placeholder="e.g. Fage" className={inputClass} />
        </Field>
      </Card>

      <Card className="p-5">
        <h2 className="text-[0.9375rem] font-semibold">Serving sizes</h2>
        <p className="mt-0.5 text-[0.8125rem] text-ink-dim">
          So you can log “1 bar” or “2 slices” instead of weighing it. Grams only.
        </p>
        <div className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <div key={r.key} className="flex items-center gap-2">
              <input name="servingLabel" value={r.label} onChange={(e) => update(r.key, { label: e.target.value })}
                     placeholder={i === 0 ? "1 serving" : "1 slice"} aria-label="Serving name"
                     className={`${inputClass} min-w-0 flex-1`} />
              <label className="relative w-28 shrink-0">
                <input name="servingGrams" value={r.grams} onChange={(e) => update(r.key, { grams: e.target.value })}
                       inputMode="decimal" placeholder="0" aria-label="Grams in this serving"
                       className={`${inputClass} tnum pr-8 text-right`} />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-dim">g</span>
              </label>
              <button type="button" aria-label="Remove this serving size"
                      onClick={() => setRows((rs) => rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [{ key: nextKey++, label: "", grams: "" }])}
                      className="press flex h-11 w-9 shrink-0 items-center justify-center text-ink-faint">
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setRows((rs) => [...rs, { key: nextKey++, label: "", grams: "" }])}
                className="press mt-2 flex min-h-11 items-center gap-1.5 rounded-full text-sm font-semibold text-accent-ink">
          <Icon name="plus" className="h-4 w-4" /> Add another serving size
        </button>
      </Card>

      <Card className="p-5">
        <h2 className="text-[0.9375rem] font-semibold">Nutrition</h2>
        <div role="tablist" aria-label="Values are per" className="mt-3 grid grid-cols-2 rounded-2xl bg-sunken p-1">
          {([["100g", "Per 100 g"], ["serving", servingOk ? `Per ${servingName}` : "Per serving"]] as const).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={effectiveBasis === k}
                    disabled={k === "serving" && !servingOk}
                    onClick={() => switchBasis(k)}
                    className={`min-h-10 truncate rounded-xl px-2 text-sm font-semibold transition-colors disabled:text-ink-faint ${
                      effectiveBasis === k ? "bg-surface text-ink shadow-card" : "text-ink-dim"
                    }`}>
              {label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[0.8125rem] text-ink-dim">
          {effectiveBasis === "serving"
            ? `Type the numbers for ${servingName} (${g(firstGrams)} g), as printed on the label.`
            : servingOk
              ? "Type the numbers for 100 g, or switch to per serving to copy the label."
              : "Type the numbers for 100 g. Add a serving size above to enter them per serving instead."}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {NUTRIENTS.map((n) => (
            <Num key={n.name} {...n} value={vals[n.name]}
                 onChange={(v) => setVals((vs) => ({ ...vs, [n.name]: v }))} />
          ))}
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg from-60% to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        <button type="submit"
                className="press mx-auto flex min-h-14 w-full max-w-md items-center justify-center rounded-2xl bg-accent px-5 text-base font-semibold text-white shadow-float">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[0.8125rem] font-medium text-ink-dim">
        {label}{optional && <span className="text-ink-faint"> · optional</span>}
      </span>
      {children}
    </label>
  );
}

type Nutrient = "kcal" | "protein" | "carb" | "fat" | "fiber";
const NUTRIENTS: { name: Nutrient; label: string; unit: string; dot: string; required?: boolean; hint?: string }[] = [
  { name: "kcal", label: "Calories", unit: "kcal", dot: "var(--color-ink)", required: true },
  { name: "protein", label: "Protein", unit: "g", dot: "var(--color-protein)", required: true },
  { name: "carb", label: "Carbs", unit: "g", dot: "var(--color-carb)", required: true },
  { name: "fat", label: "Fat", unit: "g", dot: "var(--color-fat)", required: true },
  { name: "fiber", label: "Fiber", unit: "g", dot: "var(--color-fiber)", hint: "Leave blank if not listed" },
];

function Num({ name, label, unit, value, onChange, required, hint, dot }: {
  name: string; label: string; unit: string; value: string; onChange: (v: string) => void;
  required?: boolean; hint?: string; dot: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 px-1 text-[0.8125rem] font-medium text-ink-dim">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />{label}
      </span>
      <span className="relative block">
        <input name={name} type="number" inputMode="decimal" step="any" min="0" required={required}
               value={value} onChange={(e) => onChange(e.target.value)}
               placeholder={required ? "0" : "—"}
               className={`${inputClass} tnum pr-12`} />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-dim">{unit}</span>
      </span>
      {hint && <span className="mt-1 block px-1 text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}
