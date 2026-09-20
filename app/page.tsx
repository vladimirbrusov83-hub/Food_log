import Link from "next/link";
import { removeMeal } from "./actions";
import { getDay } from "@/lib/db";
import { dayLabel, isDayString, shiftDay } from "@/lib/day";
import { forGrams, g, kcal, sumMacros } from "@/lib/macros";
import { MacroLine, MacroSplit } from "@/components/macro-bar";
import { TodayRedirect } from "@/components/today-redirect";
import { AddMeal, EntryRow } from "@/components/day-controls";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DayPage(
  { searchParams }: { searchParams: Promise<{ d?: string; today?: string }> },
) {
  const { d, today } = await searchParams;
  // No date in the URL means the phone has not said what day it is yet.
  if (!isDayString(d)) return <TodayRedirect />;
  const todayStr = isDayString(today) ? today : d;

  const meals = await getDay(d);
  const allEntries = meals.flatMap((m) => m.entries);
  const dayTotal = sumMacros(allEntries.map((e) => forGrams(e, e.grams)));

  return (
    <main className="mx-auto max-w-md px-4 pt-3">
      <header className="sticky top-0 z-30 -mx-4 bg-bg/95 px-4 pb-3 pt-2 backdrop-blur">
        <div className="flex items-center justify-between">
          <Link
            href={`/?d=${shiftDay(d, -1)}&today=${todayStr}`}
            aria-label="Previous day"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim"
          >‹</Link>

          <Link href={`/?d=${todayStr}&today=${todayStr}`} className="text-center">
            <h1 className="display text-2xl font-semibold">{dayLabel(d, todayStr)}</h1>
            <p className="text-[0.6875rem] text-ink-dim">{d}</p>
          </Link>

          <Link
            href={`/?d=${shiftDay(d, 1)}&today=${todayStr}`}
            aria-label="Next day"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim"
          >›</Link>
        </div>

        <div className="mt-2 space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className="tnum display text-3xl font-semibold">{kcal(dayTotal.kcal)}</span>
            <span className="eyebrow text-ink-dim">kcal</span>
          </div>
          <MacroSplit total={dayTotal} />
          <MacroLine total={dayTotal} fiberComplete={dayTotal.fiberComplete} size="lg" />
        </div>
      </header>

      <div className="space-y-2 pb-4">
        {meals.map((meal) => {
          const total = sumMacros(meal.entries.map((e) => forGrams(e, e.grams)));
          return (
            <Card key={meal.name} className="overflow-hidden">
              <details open={meal.entries.length > 0}>
                <summary className="flex min-h-14 items-center gap-3 px-3 py-2.5">
                  <span className="chev text-ink-dim">›</span>
                  <span className="flex-1 font-semibold">{meal.name}</span>
                  <span className="text-right">
                    <span className="tnum block text-sm font-semibold">{kcal(total.kcal)}</span>
                    <span className="tnum block text-[0.6875rem] text-ink-dim">
                      {g(total.protein)}p · {g(total.carb)}c · {g(total.fat)}f
                    </span>
                  </span>
                </summary>

                <div className="border-t border-line">
                  {meal.entries.map((e) => (
                    <EntryRow key={e.id} entry={e} />
                  ))}

                  <div className="flex items-center gap-2 px-3 py-2">
                    <Link
                      href={`/add?d=${d}&meal=${encodeURIComponent(meal.name)}`}
                      className="flex min-h-11 flex-1 items-center gap-2 text-sm font-semibold text-accent"
                    >
                      <span className="text-lg leading-none">+</span> Add food
                    </Link>
                    {meal.id !== null && meal.entries.length === 0 && (
                      <RemoveMealButton mealId={meal.id} />
                    )}
                  </div>
                </div>
              </details>
            </Card>
          );
        })}

        <AddMeal day={d} existing={meals.map((m) => m.name)} />
      </div>
    </main>
  );
}

/** Only offered on an empty meal — deleting one with food in it is a mistake. */
function RemoveMealButton({ mealId }: { mealId: number }) {
  return (
    <form action={removeMeal}>
      <input type="hidden" name="mealId" value={mealId} />
      <button className="min-h-11 px-3 text-sm text-ink-dim" aria-label="Remove this meal">
        Remove
      </button>
    </form>
  );
}
