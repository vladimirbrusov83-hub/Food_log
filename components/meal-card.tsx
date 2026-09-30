"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteEntryInPlace, removeMeal } from "@/app/actions";
import { forGrams, kcal, sumMacros } from "@/lib/macros";
import { portionText } from "@/lib/servings";
import type { Meal } from "@/lib/types";
import { MacroInline } from "./macro-bar";
import { SwipeDelete } from "./swipe-delete";
import { Card, Icon } from "./ui";

/**
 * One meal. Tap the header to fold it; folded, it still shows the meal's
 * calories and fat/carbs/protein. Meals with food in them start open.
 * A food swipes left to Delete; it goes at once, no confirm.
 */
export function MealCard({ meal, day, custom }: { meal: Meal; day: string; custom: boolean }) {
  const [open, setOpen] = useState(meal.entries.length > 0);
  const [swiped, setSwiped] = useState<number | null>(null);
  // Hidden the moment Delete is tapped; the server catches up behind it.
  const [gone, setGone] = useState<number[]>([]);
  const [, start] = useTransition();
  const entries = meal.entries.filter((e) => !gone.includes(e.id));
  const empty = entries.length === 0;
  const total = sumMacros(entries.map((e) => forGrams(e, e.grams)));

  function remove(id: number) {
    setGone((g) => [...g, id]);
    setSwiped(null);
    start(() => deleteEntryInPlace(id));
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-1 py-2 pl-2 pr-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          disabled={empty}
          className="press flex min-h-14 min-w-0 flex-1 items-center gap-2 rounded-2xl px-3 text-left disabled:active:scale-100"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[1.0625rem] font-semibold">{meal.name}</span>
            {empty ? (
              <span className="block text-[0.8125rem] text-ink-faint">Nothing logged</span>
            ) : (
              <span className="flex flex-wrap items-baseline gap-x-2 text-[0.8125rem]">
                <span className="tnum font-semibold">{kcal(total.kcal)} kcal</span>
                <MacroInline m={total} />
              </span>
            )}
          </span>
          {!empty && (
            <Icon name="chevron"
                  className={`h-4 w-4 shrink-0 text-ink-faint transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
          )}
        </button>
        {empty && custom && meal.id !== null && (
          <form action={removeMeal}>
            <input type="hidden" name="mealId" value={meal.id} />
            <button className="press min-h-11 rounded-full px-3 text-sm font-medium text-ink-dim" aria-label="Remove this meal">
              Remove
            </button>
          </form>
        )}
        <Link href={`/add?d=${day}&meal=${encodeURIComponent(meal.name)}`} aria-label={`Add food to ${meal.name}`}
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Icon name="plus" className="h-5 w-5" strokeWidth={2.4} />
        </Link>
      </div>

      {!empty && open && (
        <ul className="divide-y divide-line border-t border-line">
          {entries.map((e) => {
            const m = forGrams(e, e.grams);
            return (
              <li key={e.id}>
                <SwipeDelete label={e.name} open={swiped === e.id}
                             onOpen={(o) => setSwiped(o ? e.id : null)} onDelete={() => remove(e.id)}>
                  <Link href={`/entry/${e.id}`} className="flex min-h-16 items-center gap-3 px-5 py-2.5 active:bg-sunken">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-medium">{e.name}</span>
                      <span className="tnum block truncate text-[0.8125rem] text-ink-dim">
                        {portionText(e)}{e.brand ? ` · ${e.brand}` : ""}
                      </span>
                      <MacroInline m={m} className="mt-0.5" />
                    </span>
                    <span className="tnum shrink-0 text-[0.9375rem] font-semibold">
                      {kcal(m.kcal)}<span className="ml-0.5 text-xs font-medium text-ink-faint">kcal</span>
                    </span>
                  </Link>
                </SwipeDelete>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
