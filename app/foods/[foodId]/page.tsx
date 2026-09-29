import { notFound } from "next/navigation";
import { editFood, removeFood } from "@/app/actions";
import { getFood } from "@/lib/db";
import { FoodForm } from "@/components/food-form";
import { Button, TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditFoodPage({ params }: { params: Promise<{ foodId: string }> }) {
  const { foodId } = await params;
  const food = await getFood(Number(foodId));
  if (!food) notFound();

  return (
    <main className="mx-auto max-w-md px-4">
      <TopBar back="/foods" title={food.name} sub="Edit food" />
      <p className="mb-3 px-1 text-[0.8125rem] leading-relaxed text-ink-dim">
        Changes apply from now on. Everything already logged keeps the numbers it was saved with.
      </p>
      <FoodForm action={editFood} hidden={{ foodId: food.id }} food={food} submitLabel="Save changes" nameAutoFocus={false} padBottom={false} />
      <form action={removeFood} className="mt-4 pb-32">
        <input type="hidden" name="foodId" value={food.id} />
        <Button type="submit" variant="danger" className="w-full">Delete this food</Button>
      </form>
    </main>
  );
}
