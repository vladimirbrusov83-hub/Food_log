import Link from "next/link";
import { notFound } from "next/navigation";
import { removeEntry, updateEntry } from "@/app/actions";
import { getEntry, getFood } from "@/lib/db";
import { PortionForm } from "@/components/portion-form";
import { Button, TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

/**
 * One logged food: change how much, or take it out. The numbers come from the
 * entry's own snapshot; the food is only asked for its servings, and may be gone.
 */
export default async function EntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const entry = await getEntry(Number(entryId));
  if (!entry) notFound();
  const food = entry.foodId === null ? null : await getFood(entry.foodId);

  return (
    <main className="mx-auto max-w-md px-4">
      <TopBar
        back={`/?d=${entry.day}`} close sub={entry.meal} title={entry.name}
        action={food && food.source !== "usda" && (
          // Wrong numbers from a scan: fix the food, and by default this entry with it.
          <Link href={`/foods/${food.id}?back=${encodeURIComponent(`/?d=${entry.day}`)}`}
                className="press flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-accent-ink">
            Edit food
          </Link>
        )}
      />
      {entry.brand && <p className="-mt-1 mb-3 px-1 text-sm text-ink-dim">{entry.brand}</p>}
      <div className="pt-2">
        <PortionForm
          food={{ ...entry, servings: food?.servings ?? [] }}
          initial={entry}
          action={updateEntry}
          hidden={{ entryId: entry.id, day: entry.day }}
          submitLabel="Save"
        />
      </div>
      {/* Outside the portion form: a form cannot sit inside another. */}
      <form action={removeEntry} className="mt-4 pb-32">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="day" value={entry.day} />
        <Button type="submit" variant="danger" className="w-full">Remove from {entry.meal}</Button>
      </form>
    </main>
  );
}
