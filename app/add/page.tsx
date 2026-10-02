import Link from "next/link";
import { getDay, getMyFoods, getRecentFoods } from "@/lib/db";
import { isDayString } from "@/lib/day";
import { AddSearch } from "@/components/add-search";
import { Empty, TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AddPage(
  { searchParams }: { searchParams: Promise<{ d?: string; meal?: string }> },
) {
  const { d, meal } = await searchParams;
  if (!isDayString(d) || !meal) {
    return <Empty>Open this from a meal on the day screen.</Empty>;
  }

  // He eats the same things. After a week or two the Recent list is the whole app.
  const [recent, mine, meals] = await Promise.all([
    getRecentFoods(), getMyFoods(), getDay(d),
  ]);
  // What is already in the day, the meal being added to first.
  const logged = meals
    .filter((m) => m.entries.length > 0)
    .sort((a, b) => Number(b.name === meal) - Number(a.name === meal));

  return (
    <main className="mx-auto max-w-md px-4 pb-44">
      <TopBar back={`/?d=${d}`} close sub="Add to" title={meal}
              action={
                <Link href={`/?d=${d}`} className="press flex min-h-11 items-center rounded-full px-3 text-[0.9375rem] font-semibold text-accent-ink">
                  Done
                </Link>
              } />

      <AddSearch day={d} meal={meal} recent={recent} mine={mine} logged={logged} />
    </main>
  );
}
