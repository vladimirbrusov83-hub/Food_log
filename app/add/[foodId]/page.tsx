import Link from "next/link";
import { notFound } from "next/navigation";
import { getFood } from "@/lib/db";
import { isDayString } from "@/lib/day";
import { PortionForm } from "@/components/portion-form";
import { Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PortionPage({
  params, searchParams,
}: {
  params: Promise<{ foodId: string }>;
  searchParams: Promise<{ d?: string; meal?: string }>;
}) {
  const { foodId } = await params;
  const { d, meal } = await searchParams;
  if (!isDayString(d) || !meal) return <Empty>Open this from a meal on the day screen.</Empty>;

  const food = await getFood(Number(foodId));
  if (!food) notFound();

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-3">
      <header className="flex items-center gap-2 pb-4">
        <Link
          href={`/add?d=${d}&meal=${encodeURIComponent(meal)}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim"
        >‹</Link>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-accent">{meal}</p>
          <h1 className="display truncate text-xl font-semibold">{food.name}</h1>
          {food.brand && <p className="truncate text-xs text-ink-dim">{food.brand}</p>}
        </div>
      </header>

      <PortionForm food={food} day={d} meal={meal} />
    </main>
  );
}
