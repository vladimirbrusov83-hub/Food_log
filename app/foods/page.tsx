import Link from "next/link";
import { getMyFoods } from "@/lib/db";
import { forGrams, g, kcal } from "@/lib/macros";
import { MacroInline } from "@/components/macro-bar";
import { Icon, LinkButton, List, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function FoodsPage() {
  // USDA rows are left out on purpose: 434 seeded foods is a catalogue, not a
  // list worth scrolling. This screen is what he scanned or created himself.
  const foods = await getMyFoods();

  return (
    <main className="mx-auto max-w-md px-4 pb-6">
      <PageTitle title="My foods" sub={`${foods.length} saved`} action={
        <LinkButton href="/foods/new" variant="primary" className="mb-1 min-h-10 rounded-full px-4 text-sm">
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.4} /> Create
        </LinkButton>
      } />

      {foods.length === 0 ? (
        <div className="rounded-3xl bg-surface px-6 py-10 text-center shadow-card">
          <p className="font-semibold">No foods of your own yet</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-dim">
            Create the things you eat often — your protein shake, a homemade meal, a snack bar —
            with serving sizes, and they’re one tap away when you log.
          </p>
        </div>
      ) : (
        <List>
          {foods.map((f) => {
            const s = f.servings[0];
            const m = forGrams(f, s ? s.grams : 100);
            return (
              <li key={f.id}>
                <Link href={`/foods/${f.id}`} className="press flex min-h-16 items-center gap-3 px-5 py-3 active:bg-sunken">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium">{f.name}</span>
                    <span className="tnum block truncate text-[0.8125rem] text-ink-dim">
                      {[f.brand, s ? `${s.label} · ${g(s.grams)} g` : "100 g"].filter(Boolean).join(" · ")}
                    </span>
                    <MacroInline m={m} className="mt-0.5" />
                  </span>
                  <span className="tnum shrink-0 text-[0.9375rem] font-semibold">
                    {kcal(m.kcal)}<span className="ml-0.5 text-xs font-medium text-ink-faint">kcal</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </List>
      )}
    </main>
  );
}
