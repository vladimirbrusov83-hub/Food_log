import Link from "next/link";
import { getRecentFoods } from "@/lib/db";
import { isDayString } from "@/lib/day";
import { AddSearch } from "@/components/add-search";
import { Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AddPage(
  { searchParams }: { searchParams: Promise<{ d?: string; meal?: string }> },
) {
  const { d, meal } = await searchParams;
  if (!isDayString(d) || !meal) {
    return <Empty>Open this from a meal on the day screen.</Empty>;
  }

  // He eats the same things. After a week or two this list is the whole app.
  const recent = await getRecentFoods();

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-3">
      <header className="flex items-center gap-2 pb-3">
        <Link href={`/?d=${d}`} className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim">
          ‹
        </Link>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-accent">Add to</p>
          <h1 className="display truncate text-xl font-semibold">{meal}</h1>
        </div>
        <Link
          href={`/scan?d=${d}&meal=${encodeURIComponent(meal)}`}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-bg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" className="h-5 w-5">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M15 8v8" />
          </svg>
          Scan
        </Link>
      </header>

      <AddSearch day={d} meal={meal} recent={recent} />
    </main>
  );
}
