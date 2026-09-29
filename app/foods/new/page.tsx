import { saveFood } from "@/app/actions";
import { FoodForm } from "@/components/food-form";
import { TopBar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewFoodPage(
  { searchParams }: { searchParams: Promise<{ d?: string; meal?: string }> },
) {
  const { d, meal } = await searchParams;
  const logging = !!(d && meal);

  return (
    <main className="mx-auto max-w-md px-4">
      <TopBar back={logging ? `/add?d=${d}&meal=${encodeURIComponent(meal!)}` : "/foods"}
              close title="Create food" sub={logging ? `Then add to ${meal}` : "My foods"} />
      <div className="pt-2">
        <FoodForm
          action={saveFood}
          hidden={logging ? { day: d!, meal: meal! } : {}}
          submitLabel={logging ? "Save and choose amount" : "Save food"}
        />
      </div>
    </main>
  );
}
