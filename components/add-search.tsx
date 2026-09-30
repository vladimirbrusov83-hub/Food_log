"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { addMany, adoptOffProduct, browseStore, searchEverything } from "@/app/actions";
import { forGrams, g, kcal, sumMacros } from "@/lib/macros";
import { dayLabel, toDayString } from "@/lib/day";
import { portionText } from "@/lib/servings";
import { STORES, type Food, type Meal, type Portion, type RecentFood } from "@/lib/types";
import type { OffProduct } from "@/lib/off";
import { MacroInline } from "./macro-bar";
import { Icon, LinkButton, List, SectionLabel } from "./ui";

/**
 * Search first, then the two ways to bring in something new, then what he
 * already eats. The search hits the bundled library and Open Food Facts in one
 * action; an OFF hit is saved into his own library the moment he picks it, so
 * it is instant the second time.
 *
 * Opens on Recent. The Today tab is the day so far, to check what is already in.
 *
 * The circle on a row ticks it; tick several and the footer adds them all at
 * once, each at the portion its row shows. Tapping the row itself still opens
 * the portion screen for one food.
 */

/** A ticked food and the portion it will go in at. */
type Ticked = { food: Food; portion: Portion };
export function AddSearch(
  { day, meal, recent, mine, stores, logged }:
  { day: string; meal: string; recent: RecentFood[]; mine: Food[]; stores: string[]; logged: Meal[] },
) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<string>(recent.length || !mine.length ? "recent" : "mine");
  const [picked, setPicked] = useState<Ticked[]>([]);
  const isPicked = (id: number) => picked.some((p) => p.food.id === id);
  const toggle = (food: Food, portion: Portion) =>
    setPicked((list) => list.some((p) => p.food.id === food.id)
      ? list.filter((p) => p.food.id !== food.id)
      : [...list, { food, portion }]);
  // "Today" unless the day being filled is another one. Read after mount: the
  // server does not know the phone's date.
  const [dayName, setDayName] = useState("Today");
  useEffect(() => setDayName(dayLabel(day, toDayString(new Date()))), [day]);
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

  const tabs: [string, string][] = [["today", dayName], ["recent", "Recent"], ["mine", "My foods"], ...STORES.filter((s) => stores.includes(s)).map((s) => [s, s] as [string, string])];

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
              <List>{results.mine.map((f) => <FoodRow key={f.id} food={f} href={href(f.id)} picked={isPicked(f.id)} onPick={toggle} />)}</List>
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
            <List>{storeFoods[store].map((f) => <FoodRow key={f.id} food={f} href={href(f.id)} picked={isPicked(f.id)} onPick={toggle} />)}</List>
          </section>
        )
      ) : tab === "today" ? (
        <DaySoFar day={day} logged={logged} />
      ) : tab === "recent" ? (
        recent.length === 0 ? (
          <Hint>Foods you log show up here, with the amount you had last time. One tap on + logs it again.</Hint>
        ) : (
          <List>{recent.map((f) => <RecentRow key={f.id} food={f} href={href(f.id)} picked={isPicked(f.id)} onPick={toggle} />)}</List>
        )
      ) : mine.length === 0 ? (
        <Hint>Foods you create or scan land here.</Hint>
      ) : (
        <List>{mine.map((f) => <FoodRow key={f.id} food={f} href={href(f.id)} picked={isPicked(f.id)} onPick={toggle} />)}</List>
      )}

      {picked.length > 0 && <AddPicked day={day} meal={meal} picked={picked} onClear={() => setPicked([])} />}
    </div>
  );
}

/** The footer for ticked foods: one tap logs them all. */
function AddPicked({ day, meal, picked, onClear }: { day: string; meal: string; picked: Ticked[]; onClear: () => void }) {
  const total = picked.reduce((n, p) => n + forGrams(p.food, p.portion.grams).kcal, 0);
  const items = picked.map((p) => ({ foodId: p.food.id, ...p.portion }));
  return (
    <form action={addMany}
          className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg from-60% to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+1.75rem)] pt-6">
      <input type="hidden" name="day" value={day} />
      <input type="hidden" name="meal" value={meal} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="mx-auto flex max-w-md items-center gap-2">
        <button type="button" onClick={onClear}
                className="press min-h-14 shrink-0 rounded-2xl bg-surface px-4 text-[0.9375rem] font-semibold text-ink-dim shadow-card">
          Clear
        </button>
        <button type="submit"
                className="press flex min-h-14 min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl bg-accent px-5 text-base font-semibold text-white shadow-float">
          <span className="truncate">Add {picked.length} to {meal}</span>
          <span className="tnum shrink-0 text-white/80">{kcal(total)} kcal</span>
        </button>
      </div>
    </form>
  );
}

/** The round tick on a row. */
function Tick({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={`${on ? "Untick" : "Tick"} ${label}`}
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
      <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
        on ? "border-accent bg-accent text-white" : "border-line text-transparent"
      }`}>
        <Icon name="check" className="h-4 w-4" strokeWidth={3} />
      </span>
    </button>
  );
}

/** Everything logged on the day, meal by meal, with a Done back to the diary. */
function DaySoFar({ day, logged }: { day: string; logged: Meal[] }) {
  const all = logged.flatMap((m) => m.entries.map((e) => forGrams(e, e.grams)));
  const total = sumMacros(all);
  return (
    <div className="space-y-5">
      {logged.length === 0 ? (
        <Hint>Nothing logged yet. What you add shows up here.</Hint>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-3xl bg-surface px-5 py-4 shadow-card">
            <span className="tnum text-[1.0625rem] font-semibold">{kcal(total.kcal)} kcal</span>
            <MacroInline m={total} />
          </div>
          {logged.map((m) => {
            const mt = sumMacros(m.entries.map((e) => forGrams(e, e.grams)));
            return (
              <section key={m.name}>
                <SectionLabel right={<span className="tnum text-sm text-ink-dim">{kcal(mt.kcal)} kcal</span>}>{m.name}</SectionLabel>
                <List>
                  {m.entries.map((e) => {
                    const em = forGrams(e, e.grams);
                    return (
                      <li key={e.id}>
                        <Link href={`/entry/${e.id}`} className="press flex min-h-16 items-center gap-3 px-5 py-2.5 active:bg-sunken">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.9375rem] font-medium">{e.name}</span>
                            <span className="tnum block truncate text-[0.8125rem] text-ink-dim">{portionText(e)}</span>
                          </span>
                          <span className="tnum shrink-0 text-[0.9375rem] font-semibold">
                            {kcal(em.kcal)}<span className="ml-0.5 text-xs font-medium text-ink-faint">kcal</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </List>
              </section>
            );
          })}
        </>
      )}
      <LinkButton href={`/?d=${day}`} variant="primary" className="w-full">Done</LinkButton>
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

/** What a tick puts in for a food with no history: its first serving, else 100 g. */
function defaultPortion(food: Food): Portion {
  const s = food.servings[0];
  return s ? { grams: s.grams, servingLabel: s.label, servingQty: 1 } : { grams: 100, servingLabel: null, servingQty: null };
}

function FoodRow({ food, href, picked, onPick }:
  { food: Food; href: string; picked: boolean; onPick: (f: Food, p: Portion) => void }) {
  const p = per(food);
  return (
    <li className="flex items-center">
      <Link href={href} className="press flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2.5 pl-5 pr-1 active:bg-sunken">
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
      <div className="pr-2"><Tick on={picked} label={food.name} onClick={() => onPick(food, defaultPortion(food))} /></div>
    </li>
  );
}

/** Tap the row to choose an amount; tick it to add last time's amount with the others. */
function RecentRow({ food, href, picked, onPick }:
  { food: RecentFood; href: string; picked: boolean; onPick: (f: Food, p: Portion) => void }) {
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
      <div className="pr-2"><Tick on={picked} label={food.name} onClick={() => onPick(food, last)} /></div>
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
