import Link from "next/link";
import { notFound } from "next/navigation";
import { logFood } from "@/app/actions";
import { getFood, getLastPortion } from "@/lib/db";
import { isDayString } from "@/lib/day";
import { PortionForm } from "@/components/portion-form";
import { Empty, TopBar } from "@/components/ui";

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

  const [food, last] = await Promise.all([getFood(Number(foodId)), getLastPortion(Number(foodId))]);
  if (!food) notFound();

  return (
    <main className="mx-auto max-w-md px-4">
      <TopBar
        back={`/add?d=${d}&meal=${encodeURIComponent(meal)}`}
        sub={`Add to ${meal}`}
        title={food.name}
        action={food.source !== "usda" && (
          <Link href={`/foods/${food.id}`} className="press flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-accent-ink">
            Edit
          </Link>
        )}
      />
      {(food.brand || food.store) && (
        <p className="-mt-1 mb-3 px-1 text-sm text-ink-dim">{[food.brand, food.store].filter(Boolean).join(" · ")}</p>
      )}
      <div className="pb-32 pt-2">
        {/* Opens on the portion he used last time — he eats the same things. */}
        <PortionForm
          food={food}
          initial={last}
          action={logFood}
          hidden={{ day: d, meal, foodId: food.id }}
          submitLabel={`Add to ${meal}`}
        />
      </div>
    </main>
  );
}
