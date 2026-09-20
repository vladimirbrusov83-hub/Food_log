"use client";

import { useState } from "react";
import { logFood } from "@/app/actions";
import { forGrams, fiberLabel, g, kcal } from "@/lib/macros";
import type { Food } from "@/lib/types";
import { Button, Card, inputClass } from "./ui";

/**
 * Grams in, macros out, live. Serving chips just fill the grams field — they
 * are a shortcut to a number, never a second unit the rest of the app has to
 * understand. Every entry is stored in grams.
 */
export function PortionForm(
  { food, day, meal }: { food: Food; day: string; meal: string },
) {
  const [grams, setGrams] = useState(() =>
    String(food.servings[0]?.grams ?? 100));

  const value = Number(grams.replace(",", "."));
  const valid = Number.isFinite(value) && value > 0;
  const m = forGrams(food, valid ? value : 0);

  return (
    <form action={logFood} className="space-y-4">
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="foodId" value={food.id} />

      <div>
        <label className="eyebrow mb-2 block text-ink-dim" htmlFor="grams">Grams</label>
        <input
          id="grams"
          name="grams"
          type="number"
          inputMode="decimal"
          step="any"
          min="1"
          autoFocus
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          className={`${inputClass} tnum display h-16 text-center text-3xl font-semibold`}
        />
      </div>

      {food.servings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {food.servings.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setGrams(String(s.grams))}
              className="tnum min-h-11 rounded-full border border-line bg-surface px-4 text-sm"
            >
              {s.label} · {g(s.grams)} g
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {[25, 50, 100, 150, 200].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setGrams(String(n))}
            className="tnum min-h-11 flex-1 rounded-xl border border-line bg-surface text-sm"
          >
            {n}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex items-baseline justify-between">
          <span className="tnum display text-4xl font-semibold">{kcal(m.kcal)}</span>
          <span className="eyebrow text-ink-dim">kcal</span>
        </div>
        <dl className="tnum mt-3 grid grid-cols-4 gap-2 text-center text-xs">
          <Stat label="Protein" value={`${g(m.protein)}g`} color="text-protein" />
          <Stat label="Carbs" value={`${g(m.carb)}g`} color="text-carb" />
          <Stat label="Fat" value={`${g(m.fat)}g`} color="text-fat" />
          <Stat
            label="Fiber"
            value={m.fiber === null ? "—" : fiberLabel(m.fiber, true)}
            color="text-fiber"
          />
        </dl>
        {m.fiber === null && (
          <p className="mt-3 text-[0.6875rem] text-ink-dim">
            Fiber unknown for this food — the day total will show a “+”.
          </p>
        )}
      </Card>

      <Button type="submit" variant="primary" disabled={!valid} className="h-14 w-full text-base">
        Add to {meal}
      </Button>
    </form>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <dt className="text-[0.625rem] uppercase tracking-wide text-ink-dim">{label}</dt>
      <dd className={`mt-0.5 font-semibold ${color}`}>{value}</dd>
    </div>
  );
}
