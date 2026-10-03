import { notFound } from "next/navigation";
import { editFood, removeFood } from "@/app/actions";
import { countEntriesForFood, getFood } from "@/lib/db";
import { FoodForm } from "@/components/food-form";
import { Button, Card, TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditFoodPage({
  params, searchParams,
}: {
  params: Promise<{ foodId: string }>;
  /** `back`: the screen that opened this — a logged entry or the add screen. */
  searchParams: Promise<{ back?: string }>;
}) {
  const { foodId } = await params;
  const { back: rawBack } = await searchParams;
  const back = rawBack?.startsWith("/") && !rawBack.startsWith("//") ? rawBack : null;
  const [food, logged] = await Promise.all([getFood(Number(foodId)), countEntriesForFood(Number(foodId))]);
  if (!food) notFound();

  return (
    <main className="mx-auto max-w-md px-4">
      <TopBar back={back ?? "/foods"} title={food.name} sub="Edit food" />
      <p className="mb-3 px-1 text-[0.8125rem] leading-relaxed text-ink-dim">
        Changes apply from now on. Everything already logged keeps the numbers it was saved with,
        unless you tick the box below.
      </p>
      <FoodForm action={editFood} hidden={{ foodId: food.id, ...(back ? { back } : {}) }} food={food}
                submitLabel="Save changes" nameAutoFocus={false} padBottom={false}>
        {logged > 0 && (
          <Card className="p-5">
            <label className="flex items-start gap-3">
              {/* On by default when he came here from something he logged: he is fixing wrong numbers. */}
              <input type="checkbox" name="fixLogged" defaultChecked={!!back}
                     className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
              <span>
                <span className="block text-[0.9375rem] font-semibold">
                  Also fix the {logged === 1 ? "1 time" : `${logged} times`} it’s already logged
                </span>
                <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-dim">
                  For when the numbers were wrong. Amounts you ate stay the same.
                </span>
              </span>
            </label>
          </Card>
        )}
      </FoodForm>
      <form action={removeFood} className="mt-4 pb-32">
        <input type="hidden" name="foodId" value={food.id} />
        <Button type="submit" variant="danger" className="w-full">Delete this food</Button>
      </form>
    </main>
  );
}
