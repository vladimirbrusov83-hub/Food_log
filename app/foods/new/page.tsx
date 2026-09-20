import Link from "next/link";
import { saveFood } from "@/app/actions";
import { Button, inputClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewFoodPage(
  { searchParams }: { searchParams: Promise<{ d?: string; meal?: string }> },
) {
  const { d, meal } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-3">
      <header className="flex items-center gap-2 pb-4">
        <Link
          href={d && meal ? `/add?d=${d}&meal=${encodeURIComponent(meal)}` : "/foods"}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim"
        >‹</Link>
        <h1 className="display text-xl font-semibold">New food</h1>
      </header>

      <form action={saveFood} className="space-y-4">
        {d && <input type="hidden" name="day" value={d} />}
        {meal && <input type="hidden" name="meal" value={meal} />}

        <input name="name" required autoFocus placeholder="Food name" className={inputClass} />
        <input name="brand" placeholder="Brand (optional)" className={inputClass} />

        <p className="text-xs text-ink-dim">
          Everything below is per 100 g — the column on the label, not the serving column.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Num name="kcal" label="Calories" required />
          <Num name="protein" label="Protein g" required />
          <Num name="carb" label="Carbs g" required />
          <Num name="fat" label="Fat g" required />
          <Num name="fiber" label="Fiber g" hint="blank if not listed" />
        </div>

        <Button type="submit" variant="primary" className="h-14 w-full text-base">
          {d && meal ? "Save and add" : "Save"}
        </Button>
      </form>
    </main>
  );
}

function Num({ name, label, required, hint }:
  { name: string; label: string; required?: boolean; hint?: string }) {
  return (
    <label className="text-xs text-ink-dim">
      {label}
      <input name={name} type="number" inputMode="decimal" step="any" min="0"
             required={required} className={`${inputClass} tnum mt-1`} />
      {hint && <span className="mt-1 block text-[0.625rem]">{hint}</span>}
    </label>
  );
}
