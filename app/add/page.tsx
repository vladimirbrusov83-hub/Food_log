import Link from "next/link";
import { undoQuickAdd } from "@/app/actions";
import { getEntry, getLoadedStores, getMyFoods, getRecentFoods } from "@/lib/db";
import { isDayString } from "@/lib/day";
import { portionText } from "@/lib/servings";
import { AddSearch } from "@/components/add-search";
import { Empty, Icon, TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AddPage(
  { searchParams }: { searchParams: Promise<{ d?: string; meal?: string; added?: string }> },
) {
  const { d, meal, added } = await searchParams;
  if (!isDayString(d) || !meal) {
    return <Empty>Open this from a meal on the day screen.</Empty>;
  }

  // He eats the same things. After a week or two the Recent list is the whole app.
  const [recent, mine, stores, just] = await Promise.all([
    getRecentFoods(), getMyFoods(), getLoadedStores(), added ? getEntry(Number(added)) : null,
  ]);

  return (
    <main className="mx-auto max-w-md px-4 pb-28">
      <TopBar back={`/?d=${d}`} close sub="Add to" title={meal}
              action={
                <Link href={`/?d=${d}`} className="press flex min-h-11 items-center rounded-full px-3 text-[0.9375rem] font-semibold text-accent-ink">
                  Done
                </Link>
              } />

      <AddSearch day={d} meal={meal} recent={recent} mine={mine} stores={stores} />

      {/* The quick "+" logs without leaving the screen; this says what went in. */}
      {just && (
        <div key={just.id} role="status"
             className="toast fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink py-2 pl-4 pr-2 text-white shadow-float">
          <Icon name="check" className="h-5 w-5 shrink-0 text-[oklch(0.8_0.12_158)]" strokeWidth={2.5} />
          <span className="min-w-0 flex-1 text-sm">
            <span className="block truncate font-semibold">{just.name}</span>
            <span className="tnum block truncate text-white/60">{portionText(just)}</span>
          </span>
          <form action={undoQuickAdd}>
            <input type="hidden" name="entryId" value={just.id} />
            <input type="hidden" name="day" value={d} />
            <input type="hidden" name="meal" value={meal} />
            <button className="press min-h-11 rounded-xl px-3 text-sm font-semibold text-white">Undo</button>
          </form>
        </div>
      )}
    </main>
  );
}
