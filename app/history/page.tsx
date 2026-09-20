import Link from "next/link";
import { getLoggedDays } from "@/lib/db";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const days = await getLoggedDays();
  const max = Math.max(1, ...days.map((d) => d.kcal));

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-4">
      <header className="pb-4">
        <p className="eyebrow text-accent">Logged</p>
        <h1 className="display text-2xl font-semibold">History</h1>
      </header>

      {days.length === 0 ? (
        <Card className="px-4 py-8 text-center text-sm text-ink-dim">
          Days you log show up here.
        </Card>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
          {days.map((d) => (
            <li key={d.day} className="border-b border-line last:border-0">
              <Link href={`/?d=${d.day}`} className="flex min-h-14 items-center gap-3 px-3 py-2">
                <span className="w-24 shrink-0 text-sm font-medium">{d.day}</span>
                {/* The bar is relative to his own biggest day, not a target —
                    he asked for no goals, so nothing here is a verdict. */}
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <span className="block h-full rounded-full bg-accent-dim"
                        style={{ width: `${(d.kcal / max) * 100}%` }} />
                </span>
                <span className="tnum w-16 shrink-0 text-right text-sm">{d.kcal}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
