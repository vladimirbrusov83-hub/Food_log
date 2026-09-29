"use client";

import { useState } from "react";
import { forGrams, g, kcal } from "@/lib/macros";
import { qtyText } from "@/lib/servings";
import type { Food, Portion } from "@/lib/types";
import { MACROS } from "./macro-bar";
import { Card, Icon } from "./ui";

type Mode = "serving" | "grams";

/**
 * How much: in servings or in grams. Either way what gets stored is grams —
 * the serving and the count ride along as a label for the list and for
 * re-opening the entry. A food with no usable serving is grams only.
 *
 * Used to add a food and to change an entry already logged, so the form's
 * action, hidden fields and button text all come from the caller.
 */
export function PortionForm(
  { food, initial, action, hidden, submitLabel, children }:
  {
    food: Pick<Food, "kcal" | "protein" | "carb" | "fat" | "fiber" | "servings">;
    initial: Portion | null;
    action: (fd: FormData) => void | Promise<void>;
    hidden: Record<string, string | number>;
    submitLabel: string;
    children?: React.ReactNode;
  },
) {
  const servings = food.servings;
  const start = initial?.servingLabel ? servings.find((s) => s.label === initial.servingLabel) : undefined;

  const [mode, setMode] = useState<Mode>(
    start || (!initial && servings.length > 0) ? "serving" : "grams");
  const [servingIdx, setServingIdx] = useState(start ? servings.indexOf(start) : 0);
  const [qty, setQty] = useState(start && initial?.servingQty ? qtyText(initial.servingQty) : "1");
  const [grams, setGrams] = useState(initial ? g(initial.grams) : "100");

  const serving = servings[servingIdx];
  const qtyNum = Number(qty.replace(",", "."));
  const gramsNum = Number(grams.replace(",", "."));
  const total = mode === "serving" && serving ? qtyNum * serving.grams : gramsNum;
  const valid = Number.isFinite(total) && total > 0;
  const m = forGrams(food, valid ? total : 0);

  function switchTo(next: Mode) {
    if (next === mode || !serving) return;
    // Carry the amount across, so switching never loses what he typed.
    if (next === "grams" && Number.isFinite(qtyNum) && qtyNum > 0) setGrams(g(qtyNum * serving.grams));
    if (next === "serving" && Number.isFinite(gramsNum) && gramsNum > 0) {
      setQty(qtyText(Math.max(0.5, Math.round((gramsNum / serving.grams) * 2) / 2)));
    }
    setMode(next);
  }

  const step = (d: number) => {
    const n = Number.isFinite(qtyNum) ? qtyNum : 1;
    setQty(qtyText(Math.max(0.5, Math.round((n + d) * 2) / 2)));
  };

  return (
    <form action={action} className="space-y-4">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="grams" value={valid ? String(Math.round(total * 10) / 10) : ""} />
      {mode === "serving" && serving && (
        <>
          <input type="hidden" name="servingLabel" value={serving.label} />
          <input type="hidden" name="servingQty" value={qtyNum} />
        </>
      )}

      {/* What this portion is worth, live. */}
      <Card className="p-5">
        <div className="flex items-end justify-between">
          <div>
            <span className="tnum text-[2.5rem] font-bold leading-none tracking-[-0.03em]">{kcal(m.kcal)}</span>
            <span className="ml-1.5 text-sm font-medium text-ink-dim">kcal</span>
          </div>
          <span className="tnum pb-1 text-sm text-ink-dim">{valid ? `${g(total)} g` : "—"}</span>
        </div>
        <dl className="mt-4 grid grid-cols-4 gap-2">
          {MACROS.map((x) => (
            <div key={x.key} className="rounded-2xl bg-sunken px-2.5 py-2">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-dim">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: x.color }} />{x.label}
              </dt>
              <dd className="tnum mt-0.5 text-[0.9375rem] font-semibold">{g(m[x.key])} g</dd>
            </div>
          ))}
          <div className="rounded-2xl bg-sunken px-2.5 py-2">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-fiber" />Fiber
            </dt>
            <dd className="tnum mt-0.5 text-[0.9375rem] font-semibold">{m.fiber === null ? "?" : `${g(m.fiber)} g`}</dd>
          </div>
        </dl>
        {m.fiber === null && (
          <p className="mt-3 text-xs text-ink-dim">Fiber isn’t known for this food, so the day’s fiber shows a “+”.</p>
        )}
      </Card>

      <Card className="p-5">
        {servings.length > 0 && (
          <div role="tablist" aria-label="Portion by" className="mb-5 grid grid-cols-2 rounded-2xl bg-sunken p-1">
            {(["serving", "grams"] as const).map((k) => (
              <button
                key={k} type="button" role="tab" aria-selected={mode === k}
                onClick={() => switchTo(k)}
                className={`min-h-10 rounded-xl text-[0.9375rem] font-semibold transition-colors ${
                  mode === k ? "bg-surface text-ink shadow-card" : "text-ink-dim"
                }`}
              >
                {k === "serving" ? "Servings" : "Grams"}
              </button>
            ))}
          </div>
        )}

        {mode === "serving" && serving ? (
          <>
            {servings.length > 1 && (
              <div className="-mx-1 mb-5 flex flex-wrap gap-2">
                {servings.map((s, i) => (
                  <button
                    key={s.id} type="button" onClick={() => setServingIdx(i)}
                    aria-pressed={i === servingIdx}
                    className={`press tnum min-h-10 rounded-full px-4 text-sm font-medium ${
                      i === servingIdx ? "bg-ink text-white" : "bg-sunken text-ink"
                    }`}
                  >
                    {s.label} <span className={i === servingIdx ? "text-white/60" : "text-ink-faint"}>· {g(s.grams)} g</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <button type="button" onClick={() => step(-0.5)} aria-label="Less"
                      className="press flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sunken text-ink">
                <Icon name="minus" className="h-5 w-5" strokeWidth={2.4} />
              </button>
              <label className="flex min-w-0 flex-1 flex-col items-center">
                <input
                  value={qty} onChange={(e) => setQty(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  inputMode="decimal" aria-label="Number of servings"
                  className="tnum w-full bg-transparent text-center text-[2.5rem] font-bold leading-none tracking-[-0.03em] focus:outline-none"
                />
                <span className="mt-1 text-sm text-ink-dim">
                  × {serving.label.replace(/^1\s+/, "")} <span className="text-ink-faint">({g(serving.grams)} g)</span>
                </span>
              </label>
              <button type="button" onClick={() => step(0.5)} aria-label="More"
                      className="press flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sunken text-ink">
                <Icon name="plus" className="h-5 w-5" strokeWidth={2.4} />
              </button>
            </div>
            <Chips
              values={["0.5", "1", "1.5", "2", "3"]}
              current={qtyText(qtyNum)}
              onPick={setQty}
              render={(v) => (v === "0.5" ? "½" : v === "1.5" ? "1½" : v)}
            />
          </>
        ) : (
          <>
            <label className="flex items-baseline justify-center gap-1.5">
              <input
                value={grams} onChange={(e) => setGrams(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
                inputMode="decimal" aria-label="Grams"
                className="tnum w-40 bg-transparent text-right text-[3rem] font-bold leading-none tracking-[-0.03em] focus:outline-none"
              />
              <span className="text-2xl font-semibold text-ink-dim">g</span>
            </label>
            <Chips values={["50", "100", "150", "200", "250"]} current={g(gramsNum)} onPick={setGrams} render={(v) => v} />
          </>
        )}
      </Card>

      {children}

      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg from-60% to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        <button
          type="submit" disabled={!valid}
          className="press mx-auto flex min-h-14 w-full max-w-md items-center justify-between rounded-2xl bg-accent px-5 text-base font-semibold text-white shadow-float disabled:opacity-40"
        >
          <span>{submitLabel}</span>
          <span className="tnum text-white/80">{kcal(m.kcal)} kcal</span>
        </button>
      </div>
    </form>
  );
}

function Chips({ values, current, onPick, render }:
  { values: string[]; current: string; onPick: (v: string) => void; render: (v: string) => string }) {
  return (
    <div className="mt-5 grid grid-cols-5 gap-2">
      {values.map((v) => (
        <button
          key={v} type="button" onClick={() => onPick(v)}
          className={`press tnum min-h-11 rounded-xl text-[0.9375rem] font-semibold ${
            current === v ? "bg-accent-soft text-accent-ink" : "bg-sunken text-ink"
          }`}
        >
          {render(v)}
        </button>
      ))}
    </div>
  );
}
