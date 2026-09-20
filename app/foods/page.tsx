import Link from "next/link";
import { getMyFoods } from "@/lib/db";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FoodsPage() {
  // USDA rows are left out on purpose: 434 seeded foods is a catalogue, not a
  // list worth scrolling. This screen is what he scanned or typed himself.
  const foods = await getMyFoods();

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-4">
      <header className="flex items-end justify-between pb-4">
        <div>
          <p className="eyebrow text-accent">Library</p>
          <h1 className="display text-2xl font-semibold">My foods</h1>
        </div>
        <Link href="/foods/new" className="flex min-h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-bg">
          + New
        </Link>
      </header>

      {foods.length === 0 ? (
        <Card className="px-4 py-8 text-center text-sm text-ink-dim">
          Nothing here yet. Anything you scan or type by hand lands on this screen.
        </Card>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
          {foods.map((f) => (
            <li key={f.id} className="border-b border-line last:border-0">
              <Link href={`/foods/${f.id}`} className="flex min-h-14 items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{f.name}</span>
                  <span className="block truncate text-[0.6875rem] text-ink-dim">
                    {[f.brand, f.barcode].filter(Boolean).join(" · ") || "typed by hand"}
                  </span>
                </span>
                <span className="tnum shrink-0 text-right text-xs text-ink-dim">
                  {f.kcal} kcal
                  <span className="block text-[0.625rem]">per 100 g</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
