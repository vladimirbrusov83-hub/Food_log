"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { adoptOffProduct, browseStore, quickAdd, searchEverything } from "@/app/actions";
import { forGrams, g, kcal } from "@/lib/macros";
import { portionText } from "@/lib/servings";
import { STORES, type Food, type RecentFood } from "@/lib/types";
import type { OffProduct } from "@/lib/off";
import { Icon, List, SectionLabel } from "./ui";

/**
 * Search first, then the two ways to bring in something new, then what he
 * already eats. The search hits the bundled library and Open Food Facts in one
 * action; an OFF hit is saved into his own library the moment he picks it, so
 * it is instant the second time.
 */
export function AddSearch(
  { day, meal, recent, mine, stores }:
  { day: string; meal: string; recent: RecentFood[]; mine: Food[]; stores: string[] },
) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<string>(recent.length || !mine.length ? "recent" : "mine");
  const [results, setResults] = useState<{ mine: Food[]; off: OffProduct[] } | null>(null);
  const [storeFoods, setStoreFoods] = useState<Record<string, Food[]>>({});
  const [pending, start] = useTransition();
  const store = (STORES as readonly string[]).includes(tab) ? tab : null;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults(null); return; }
    // Typed fast, searched once: 250ms after the last keystroke. A store tab narrows it.
    const t = setTimeout(() => {
      start(async () => setResults(await searchEverything(q, store)));
    }, 250);
    return () => clearTimeout(t);
  }, [query, store]);

  useEffect(() => {
    if (store && !storeFoods[store]) {
      start(async () => {
        const foods = await browseStore(store);
        setStoreFoods((s) => ({ ...s, [store]: foods }));
      });
    }
  }, [store, storeFoods]);

  const tabs: [string, string][] = [["recent", "Recent"], ["mine", "My foods"], ...STORES.filter((s) => stores.includes(s)).map((s) => [s, s] as [string, string])];

  const q = `d=${day}&meal=${encodeURIComponent(meal)}`;
  const href = (foodId: number) => `/add/${foodId}?${q}`;

  return (
    <div className="space-y-5 pt-2">
      <label className="relative block">
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={store ? `Search ${store}` : "Search foods"}
          type="search"
          // No autoFocus: on iOS it throws the keyboard up over the recent list,
          // which is the part he wants most of the time.
          autoCorrect="off"
          autoCapitalize="none"
          className="w-full min-h-12 rounded-2xl bg-surface py-3 pl-12 pr-4 text-[0.9375rem] shadow-card placeholder:text-ink-faint focus:outline-2 focus:outline-accent"
        />
        {pending && (
          <span className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-accent" />
        )}
      </label>

      {results === null && (
        <div className="grid grid-cols-2 gap-3">
          <Action href={`/scan?${q}`} icon="scan" title="Scan barcode" />
          <Action href={`/foods/new?${q}`} icon="pencil" title="Create food" />
        </div>
      )}

      <div role="tablist" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                  className={`press min-h-9 shrink-0 rounded-full px-4 text-sm font-semibold ${
                    tab === k ? "bg-ink text-white" : "text-ink-dim"
                  }`}>
            {label}
          </button>
        ))}
      </div>

      {results !== null ? (
        <>
          <section>
            <SectionLabel>{store ?? "Library"}</SectionLabel>
            {results.mine.length === 0 ? (
              <Hint>Nothing {store ? `from ${store}` : "in your library"} matches “{query.trim()}”.</Hint>
            ) : (
              <List>{results.mine.map((f) => <FoodRow key={f.id} food={f} href={href(f.id)} />)}</List>
            )}
          </section>

          {results.off.length > 0 && (
            <section>
              <SectionLabel right={<span className="text-xs text-ink-faint">Open Food Facts</span>}>Packaged foods</SectionLabel>
              <List>
                {results.off.map((p) => (
                  <li key={p.barcode}><OffRow product={p} day={day} meal={meal} /></li>
                ))}
              </List>
            </section>
          )}

          <Link href={`/foods/new?${q}`}
                className="press flex min-h-12 items-center justify-center gap-2 rounded-2xl text-[0.9375rem] font-semibold text-accent-ink">
            <Icon name="plus" className="h-4 w-4" /> Create “{query.trim()}” yourself
          </Link>
        </>
      ) : store ? (
        !storeFoods[store] ? (
          <Hint>Loading {store}…</Hint>
        ) : storeFoods[store].length === 0 ? (
          <Hint>No {store} products yet.</Hint>
        ) : (
          <section>
            <SectionLabel right={<span className="text-xs text-ink-faint">most popular first</span>}>{store}</SectionLabel>
            <List>{storeFoods[store].map((f) => <FoodRow key={f.id} food={f} href={href(f.id)} />)}</List>
          </section>
        )
      ) : tab === "recent" ? (
        recent.length === 0 ? (
          <Hint>Foods you log show up here, with the amount you had last time. One tap on + logs it again.</Hint>
        ) : (
          <List>{recent.map((f) => <RecentRow key={f.id} food={f} href={href(f.id)} day={day} meal={meal} />)}</List>
        )
      ) : mine.length === 0 ? (
        <Hint>Foods you create or scan land here.</Hint>
      ) : (
        <List>{mine.map((f) => <FoodRow key={f.id} food={f} href={href(f.id)} />)}</List>
      )}
    </div>
  );
}

function Action({ href, icon, title }: { href: string; icon: string; title: string }) {
  return (
    <Link href={href} className="press flex min-h-14 items-center gap-2.5 rounded-2xl bg-surface px-3 shadow-card">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink">
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <span className="whitespace-nowrap text-[0.875rem] font-semibold">{title}</span>
    </Link>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="rounded-3xl bg-surface px-5 py-6 text-center text-sm leading-relaxed text-ink-dim shadow-card">{children}</p>;
}

/** Per serving when the food has one he'd recognise, else per 100 g. */
function per(food: Food) {
  const s = food.servings[0];
  return s
    ? { kcal: kcal(forGrams(food, s.grams).kcal), unit: `${s.label} · ${g(s.grams)} g` }
    : { kcal: kcal(food.kcal), unit: "100 g" };
}

function FoodRow({ food, href }: { food: Food; href: string }) {
  const p = per(food);
  return (
    <li>
      <Link href={href} className="press flex min-h-16 items-center gap-3 px-5 py-2.5 active:bg-sunken">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-medium">{food.name}</span>
          <span className="tnum block truncate text-[0.8125rem] text-ink-dim">
            {[food.brand, food.store, p.unit].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="tnum shrink-0 text-right text-[0.9375rem] font-semibold">
          {p.kcal}<span className="ml-0.5 text-xs font-medium text-ink-faint">kcal</span>
        </span>
      </Link>
    </li>
  );
}

/** Tap the row to choose an amount; tap + to log last time's amount straight away. */
function RecentRow({ food, href, day, meal }: { food: RecentFood; href: string; day: string; meal: string }) {
  const last = food.last;
  return (
    <li className="flex items-center">
      <Link href={href} className="press flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2.5 pl-5 pr-2 active:bg-sunken">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-medium">{food.name}</span>
          <span className="tnum block truncate text-[0.8125rem] text-ink-dim">
            {portionText(last)} · {kcal(forGrams(food, last.grams).kcal)} kcal
          </span>
        </span>
      </Link>
      <form action={quickAdd} className="pr-3">
        <input type="hidden" name="day" value={day} />
        <input type="hidden" name="meal" value={meal} />
        <input type="hidden" name="foodId" value={food.id} />
        <input type="hidden" name="grams" value={last.grams} />
        <input type="hidden" name="servingLabel" value={last.servingLabel ?? ""} />
        <input type="hidden" name="servingQty" value={last.servingQty ?? ""} />
        <button aria-label={`Add ${food.name}, ${portionText(last)}`}
                className="press flex h-11 w-11 items-center justify-center rounded-full bg-accent-soft text-accent-ink">
          <Icon name="plus" className="h-5 w-5" strokeWidth={2.4} />
        </button>
      </form>
    </li>
  );
}

/** An OFF hit is not in the database yet, so picking it posts it in first. */
function OffRow({ product, day, meal }: { product: OffProduct; day: string; meal: string }) {
  return (
    <form action={adoptOffProduct}>
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
      <input type="hidden" name="servingLabel" value={product.servingLabel} />
      <button type="submit" className="press flex w-full min-h-16 items-center gap-3 px-5 py-2.5 text-left active:bg-sunken">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-medium">{product.name}</span>
          <span className="block truncate text-[0.8125rem] text-ink-dim">
            {product.brand ? `${product.brand} · ` : ""}100 g
          </span>
        </span>
        <span className="tnum shrink-0 text-right text-[0.9375rem] font-semibold">
          {product.kcal}<span className="ml-0.5 text-xs font-medium text-ink-faint">kcal</span>
        </span>
      </button>
    </form>
  );
}
