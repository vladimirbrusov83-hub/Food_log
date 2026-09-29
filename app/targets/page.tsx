import Link from "next/link";
import { saveTargets } from "@/app/actions";
import { getTargets } from "@/lib/db";
import { isDayString } from "@/lib/day";
import { Button, Card, inputClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TargetsPage(
  { searchParams }: { searchParams: Promise<{ d?: string }> },
) {
  const { d } = await searchParams;
  const day = isDayString(d) ? d : "";
  const t = await getTargets();

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-3">
      <header className="flex items-center gap-2 pb-4">
        <Link href={day ? `/?d=${day}` : "/"} className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim">‹</Link>
        <h1 className="display text-xl font-semibold">Daily targets</h1>
      </header>

      <Card className="mb-4 p-3 text-xs text-ink-dim">
        The lines on the day screen fill toward these. Leave one blank to just
        see its grams.
      </Card>

      <form action={saveTargets} className="space-y-4">
        <input type="hidden" name="day" value={day} />
        <div className="grid grid-cols-3 gap-3">
          <Num name="protein" label="Protein g" value={t.protein} color="text-protein" />
          <Num name="carb" label="Carbs g" value={t.carb} color="text-carb" />
          <Num name="fat" label="Fat g" value={t.fat} color="text-fat" />
        </div>
        <Button type="submit" variant="primary" className="h-14 w-full text-base">Save</Button>
      </form>
    </main>
  );
}

function Num({ name, label, value, color }: {
  name: string; label: string; value: number | null; color: string;
}) {
  return (
    <label className={`text-xs ${color}`}>
      {label}
      <input name={name} type="number" inputMode="decimal" step="any" min="0"
             defaultValue={value ?? ""} className={`${inputClass} tnum mt-1`} />
    </label>
  );
}
