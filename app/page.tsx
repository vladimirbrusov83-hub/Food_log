import { getDay, getLoggedDaysBetween, getTargets } from "@/lib/db";
import { isDayString, shiftDay } from "@/lib/day";
import { forGrams, kcal, sumMacros } from "@/lib/macros";
import { MacroDonut, MacroTargets } from "@/components/macro-bar";
import { MealCard } from "@/components/meal-card";
import { TodayRedirect } from "@/components/today-redirect";
import { DayHeader } from "@/components/day-header";
import { AddMeal } from "@/components/day-controls";
import { Card } from "@/components/ui";
import { STANDARD_MEALS } from "@/lib/types";

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
        {meals.map((meal) => (
          <MealCard key={meal.name} meal={meal} day={d}
                    custom={!(STANDARD_MEALS as readonly string[]).includes(meal.name)} />
        ))}
        <AddMeal day={d} existing={meals.map((m) => m.name)} />
      </div>
    </main>
  );
}
