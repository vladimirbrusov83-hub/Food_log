"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteEntryInPlace, moveEntryToMeal, removeMeal } from "@/app/actions";
import { forGrams, kcal, sumMacros } from "@/lib/macros";
import { portionText } from "@/lib/servings";
import type { Entry, Meal } from "@/lib/types";
import { MacroInline } from "./macro-bar";
import { SwipeDelete, type Hold } from "./swipe-delete";
import { Card, Icon } from "./ui";

/**
 * One meal. Tap the header to fold it; folded, it still shows the meal's
 * calories and fat/carbs/protein. Meals with food in them start open.
 * A food swipes left to Delete; it goes at once, no confirm. Press and hold a
 * food to lift it, then drop it on another meal to move it there.
 *
 * The drop target is found with elementFromPoint and marked with a
 * `data-drop` attribute straight on the DOM, so the cards need no shared
 * state: whichever card the finger is over lights up.
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

  // Fresh data from the server replaces the optimistic hiding — otherwise a
  // food moved out and back again would stay hidden. A meal that just got
  // its first food opens.
  const hadFood = useRef(meal.entries.length > 0);
  useEffect(() => {
    setGone([]);
    if (!hadFood.current && meal.entries.length > 0) setOpen(true);
    hadFood.current = meal.entries.length > 0;
  }, [meal.entries]);

  /** Hide a food now, and put it back if the server says no (a dropped connection). */
  function hideWhile(id: number, work: () => Promise<void>) {
    setGone((g) => [...g, id]);
    start(async () => {
      try { await work(); } catch { setGone((g) => g.filter((x) => x !== id)); }
    });
  }

  function remove(id: number) {
    setSwiped(null);
    hideWhile(id, () => deleteEntryInPlace(id));
  }

  const [lifted, setLifted] = useState<{ entry: Entry; x: number; y: number; w: number } | null>(null);
  const scroll = useRef<{ y: number; timer?: ReturnType<typeof setInterval> }>({ y: 0 });

  function dropTarget(x: number, y: number): HTMLElement | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-meal]") ?? null;
    document.querySelectorAll<HTMLElement>("[data-drop]").forEach((c) => { if (c !== el) delete c.dataset.drop; });
    if (el && el.dataset.meal !== meal.name) el.dataset.drop = "on";
    return el;
  }

  function holdFor(entry: Entry): Hold {
    let w = 0;
    return {
      start(x, y) {
        w = Math.min(window.innerWidth - 32, 420);
        setSwiped(null);
        setLifted({ entry, x, y, w });
        // Near the top or bottom edge the page scrolls, so a far meal is reachable.
        scroll.current.y = y;
        scroll.current.timer = setInterval(() => {
          const yy = scroll.current.y;
          const step = yy < 100 ? -14 : yy > window.innerHeight - 110 ? 14 : 0;
          if (step) window.scrollBy(0, step);
        }, 16);
      },
      move(x, y) {
        scroll.current.y = y;
        setLifted({ entry, x, y, w });
        dropTarget(x, y);
      },
      end(x, y) {
        const target = dropTarget(x, y)?.dataset.meal;
        this.cancel();
        if (target && target !== meal.name) {
          hideWhile(entry.id, () => moveEntryToMeal(entry.id, day, target));
        }
      },
      cancel() {
        clearInterval(scroll.current.timer);
        document.querySelectorAll<HTMLElement>("[data-drop]").forEach((c) => delete c.dataset.drop);
        setLifted(null);
      },
    };
  }

  return (
    <Card className="drop-card overflow-hidden" data-meal={meal.name}>
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
              <li key={e.id} className={lifted?.entry.id === e.id ? "opacity-30" : ""}>
                <SwipeDelete label={e.name} open={swiped === e.id} hold={holdFor(e)}
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

      {/* The lifted food, under the finger. Pointer-transparent so the drop
          target can be found beneath it. */}
      {lifted && (
        <div aria-hidden
             className="pointer-events-none fixed z-50 flex min-h-14 items-center gap-3 rounded-2xl bg-surface px-5 py-2.5 shadow-float ring-2 ring-accent"
             style={{ left: `calc(50% - ${lifted.w / 2}px)`, top: lifted.y - 28, width: lifted.w }}>
          <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{lifted.entry.name}</span>
          <span className="tnum shrink-0 text-sm font-semibold">
            {kcal(forGrams(lifted.entry, lifted.entry.grams).kcal)} kcal
          </span>
        </div>
      )}
    </Card>
  );
}
