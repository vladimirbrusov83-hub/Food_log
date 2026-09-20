import Link from "next/link";
import { notFound } from "next/navigation";
import { editFood, removeFood } from "@/app/actions";
import { getFood } from "@/lib/db";
import { Button, Card, inputClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditFoodPage({ params }: { params: Promise<{ foodId: string }> }) {
  const { foodId } = await params;
  const food = await getFood(Number(foodId));
  if (!food) notFound();

  return (
    <main className="mx-auto max-w-md px-4 pb-8 pt-3">
      <header className="flex items-center gap-2 pb-4">
        <Link href="/foods" className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim">‹</Link>
        <h1 className="display truncate text-xl font-semibold">{food.name}</h1>
      </header>

      <Card className="mb-4 p-3 text-xs text-ink-dim">
        Changing these numbers does not change anything already logged — every
        entry keeps the macros it was saved with.
      </Card>

      <form action={editFood} className="space-y-4">
        <input type="hidden" name="foodId" value={food.id} />
        <input name="name" required defaultValue={food.name} className={inputClass} />
        <input name="brand" defaultValue={food.brand ?? ""} placeholder="Brand" className={inputClass} />

        <div className="grid grid-cols-2 gap-3">
          <Num name="kcal" label="Calories / 100 g" value={food.kcal} required />
          <Num name="protein" label="Protein g" value={food.protein} required />
          <Num name="carb" label="Carbs g" value={food.carb} required />
          <Num name="fat" label="Fat g" value={food.fat} required />
          <Num name="fiber" label="Fiber g" value={food.fiber} hint="blank = not known" />
        </div>

        <Button type="submit" variant="primary" className="h-14 w-full text-base">Save</Button>
      </form>

      <form action={removeFood} className="mt-6">
        <input type="hidden" name="foodId" value={food.id} />
        <Button type="submit" variant="danger" className="w-full">Delete this food</Button>
        <p className="mt-2 text-center text-[0.6875rem] text-ink-dim">
          Past entries stay exactly as they are.
        </p>
      </form>
    </main>
  );
}

function Num({ name, label, value, required, hint }: {
  name: string; label: string; value: number | null; required?: boolean; hint?: string;
}) {
  return (
    <label className="text-xs text-ink-dim">
      {label}
      <input name={name} type="number" inputMode="decimal" step="any" min="0"
             required={required} defaultValue={value ?? ""} className={`${inputClass} tnum mt-1`} />
      {hint && <span className="mt-1 block text-[0.625rem]">{hint}</span>}
    </label>
  );
}
