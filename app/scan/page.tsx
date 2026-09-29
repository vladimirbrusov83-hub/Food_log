import { isDayString } from "@/lib/day";
import { Scanner } from "@/components/scanner";
import { Empty, TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ScanPage(
  { searchParams }: { searchParams: Promise<{ d?: string; meal?: string }> },
) {
  const { d, meal } = await searchParams;
  if (!isDayString(d) || !meal) return <Empty>Open this from a meal on the day screen.</Empty>;

  return (
    <main className="mx-auto max-w-md px-4 pb-8">
      <TopBar back={`/add?d=${d}&meal=${encodeURIComponent(meal)}`} sub={`Add to ${meal}`} title="Scan barcode" />
      <div className="pt-2"><Scanner day={d} meal={meal} /></div>
    </main>
  );
}
