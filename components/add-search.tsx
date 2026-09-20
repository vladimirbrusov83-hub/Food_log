"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { adoptOffProduct, searchEverything } from "@/app/actions";
import type { Food } from "@/lib/types";
import type { OffProduct } from "@/lib/off";
import { inputClass } from "./ui";

/**
 * Recent first, then search. The search hits the bundled library and Open Food
 * Facts in one action; an OFF hit is saved into his own library the moment he
 * picks it, so it is instant the second time.
 */
export function AddSearch(
  { day, meal, recent }: { day: string; meal: string; recent: Food[] },
) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ mine: Food[]; off: OffProduct[] } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults(null); return; }
    // Typed fast, searched once: 250ms after the last keystroke.
    const t = setTimeout(() => {
      start(async () => setResults(await searchEverything(q)));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const href = (foodId: number) =>
    `/add/${foodId}?d=${day}&meal=${encodeURIComponent(meal)}`;

  return (
    <div className="space-y-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search foods…"
        // No autoFocus: on iOS it throws the keyboard up over the recent list,
        // which is the part he wants most of the time.
        autoCorrect="off"
        autoCapitalize="none"
        className={inputClass}
      />

      {results === null ? (
        <section>
          <h2 className="eyebrow mb-2 text-ink-dim">Recent</h2>
          {recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-dim">
              Nothing logged yet. Search for a food, or scan a barcode.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
              {recent.map((f) => <FoodRow key={f.id} food={f} href={href(f.id)} />)}
            </ul>
          )}
        </section>
      ) : (
        <>
          <section>
            <h2 className="eyebrow mb-2 text-ink-dim">
              My foods {pending && <span className="text-ink-dim">· searching</span>}
            </h2>
            {results.mine.length === 0 ? (
              <p className="px-1 text-sm text-ink-dim">No match in the library.</p>
            ) : (
              <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
                {results.mine.map((f) => <FoodRow key={f.id} food={f} href={href(f.id)} />)}
              </ul>
            )}
          </section>

          {results.off.length > 0 && (
            <section>
              <h2 className="eyebrow mb-2 text-ink-dim">Open Food Facts</h2>
              <ul className="overflow-hidden rounded-2xl border border-line bg-surface">
                {results.off.map((p) => (
                  <li key={p.barcode} className="border-b border-line last:border-0">
                    <OffRow product={p} day={day} meal={meal} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <Link
        href={`/foods/new?d=${day}&meal=${encodeURIComponent(meal)}`}
        className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-dashed border-line text-sm font-semibold text-ink-dim"
      >
        + Enter a food by hand
      </Link>
    </div>
  );
}

function FoodRow({ food, href }: { food: Food; href: string }) {
  return (
    <li className="border-b border-line last:border-0">
      <Link href={href} className="flex min-h-14 items-center gap-3 px-3 py-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{food.name}</span>
          {food.brand && <span className="block truncate text-[0.6875rem] text-ink-dim">{food.brand}</span>}
        </span>
        <span className="tnum shrink-0 text-right text-xs text-ink-dim">
          {food.kcal} kcal
          <span className="block text-[0.625rem]">per 100 g</span>
        </span>
      </Link>
    </li>
  );
}

/** An OFF hit is not in the database yet, so picking it posts it in first. */
function OffRow({ product, day, meal }: { product: OffProduct; day: string; meal: string }) {
  return (
    <form action={adoptOffProduct} className="contents">
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="barcode" value={product.barcode} />
      <input type="hidden" name="name" value={product.name} />
      <input type="hidden" name="brand" value={product.brand ?? ""} />
      <input type="hidden" name="kcal" value={product.kcal} />
      <input type="hidden" name="protein" value={product.protein} />
      <input type="hidden" name="carb" value={product.carb} />
      <input type="hidden" name="fat" value={product.fat} />
      <input type="hidden" name="fiber" value={product.fiber ?? ""} />
      <input type="hidden" name="servingGrams" value={product.servingGrams ?? ""} />
      <button type="submit" className="flex w-full min-h-14 items-center gap-3 px-3 py-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{product.name}</span>
          <span className="block truncate text-[0.6875rem] text-ink-dim">
            {product.brand ?? "Open Food Facts"}
          </span>
        </span>
        <span className="tnum shrink-0 text-right text-xs text-ink-dim">
          {product.kcal} kcal
          <span className="block text-[0.625rem]">per 100 g</span>
        </span>
      </button>
    </form>
  );
}
