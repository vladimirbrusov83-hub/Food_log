import Link from "next/link";
import { isDayString } from "@/lib/day";
import { Scanner } from "@/components/scanner";
import { Empty } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ScanPage(
  { searchParams }: { searchParams: Promise<{ d?: string; meal?: string }> },
) {
  const { d, meal } = await searchParams;
  if (!isDayString(d) || !meal) return <Empty>Open this from a meal on the day screen.</Empty>;

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-3">
      <header className="flex items-center gap-2 pb-3">
        <Link
          href={`/add?d=${d}&meal=${encodeURIComponent(meal)}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim"
        >‹</Link>
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-accent">{meal}</p>
          <h1 className="display text-xl font-semibold">Scan a barcode</h1>
        </div>
      </header>

      <Scanner day={d} meal={meal} />
    </main>
  );
}
