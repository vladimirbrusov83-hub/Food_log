import Link from "next/link";
import { removeMeal } from "./actions";
import { getDay, getLoggedDaysBetween, getTargets } from "@/lib/db";
import { isDayString, shiftDay } from "@/lib/day";
import { forGrams, kcal, sumMacros } from "@/lib/macros";
import { portionText } from "@/lib/servings";
import { MacroDonut, MacroInline, MacroTargets } from "@/components/macro-bar";
import { TodayRedirect } from "@/components/today-redirect";
import { DayHeader } from "@/components/day-header";
import { AddMeal } from "@/components/day-controls";
import { Card, Icon } from "@/components/ui";
import { STANDARD_MEALS, type Meal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DayPage(
  { searchParams }: { searchParams: Promise<{ d?: string }> },
) {
  const { d } = await searchParams;
  // No date in the URL means the phone has not said what day it is yet.
  if (!isDayString(d)) return <TodayRedirect />;

  const [meals, targets, logged] = await Promise.all([
    getDay(d), getTargets(), getLoggedDaysBetween(shiftDay(d, -7), shiftDay(d, 7)),
  ]);
  const dayTotal = sumMacros(meals.flatMap((m) => m.entries).map((e) => forGrams(e, e.grams)));

  return (
    <main className="mx-auto max-w-md px-4">
      <DayHeader day={d} logged={logged} />

      <Card className="mt-4 p-5">
        <div className="flex items-center gap-5">
          <MacroDonut total={dayTotal} size={116} stroke={11}>
            <span className="tnum text-[1.75rem] font-bold leading-none tracking-[-0.03em]">
              {kcal(dayTotal.kcal).toLocaleString("en-US")}
            </span>
            <span className="mt-1 text-xs font-medium text-ink-dim">kcal</span>
          </MacroDonut>
          <div className="min-w-0 flex-1">
            <MacroTargets total={dayTotal} targets={targets} day={d} />
          </div>
        </div>
      </Card>

      <div className="mt-4 space-y-3 pb-6">
        {meals.map((meal) => <MealCard key={meal.name} meal={meal} day={d} />)}
        <AddMeal day={d} existing={meals.map((m) => m.name)} />
      </div>
    </main>
  );
}

function MealCard({ meal, day }: { meal: Meal; day: string }) {
  const total = sumMacros(meal.entries.map((e) => forGrams(e, e.grams)));
  const addHref = `/add?d=${day}&meal=${encodeURIComponent(meal.name)}`;
  const empty = meal.entries.length === 0;
  const custom = !(STANDARD_MEALS as readonly string[]).includes(meal.name);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 py-3.5 pl-5 pr-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[1.0625rem] font-semibold">{meal.name}</h2>
          {empty ? (
            <p className="text-[0.8125rem] text-ink-faint">Nothing logged</p>
          ) : (
            <p className="flex flex-wrap items-baseline gap-x-2 text-[0.8125rem]">
              <span className="tnum font-semibold">{kcal(total.kcal)} kcal</span>
              <MacroInline m={total} />
            </p>
          )}
        </div>
        {empty && custom && meal.id !== null && <RemoveMealButton mealId={meal.id} />}
        <Link href={addHref} aria-label={`Add food to ${meal.name}`}
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Icon name="plus" className="h-5 w-5" strokeWidth={2.4} />
        </Link>
      </div>

      {!empty && (
        <ul className="divide-y divide-line border-t border-line">
          {meal.entries.map((e) => {
            const m = forGrams(e, e.grams);
            return (
              <li key={e.id}>
                <Link href={`/entry/${e.id}`} className="press flex min-h-14 items-center gap-3 px-5 py-2.5 active:bg-sunken">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium">{e.name}</span>
                    <span className="tnum block truncate text-[0.8125rem] text-ink-dim">
                      {portionText(e)}{e.brand ? ` · ${e.brand}` : ""}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-[0.9375rem] font-semibold">{kcal(m.kcal)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Only offered on an empty meal he added himself — the four standard ones stay. */
function RemoveMealButton({ mealId }: { mealId: number }) {
  return (
    <form action={removeMeal}>
      <input type="hidden" name="mealId" value={mealId} />
      <button className="press min-h-11 rounded-full px-3 text-sm font-medium text-ink-dim" aria-label="Remove this meal">
        Remove
      </button>
    </form>
  );
}
