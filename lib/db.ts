import { neon } from "@neondatabase/serverless";
import { STANDARD_MEALS, type Entry, type Food, type Meal, type Portion, type RecentFood, type Serving } from "./types";
import { usableServings } from "./servings";

type Neon = ReturnType<typeof neon>;
let client: Neon | undefined;

/**
 * Built on first query, not at import time. `next build` loads every route
 * module even though they are all dynamic, so connecting at import would make
 * the build fail on a machine that has no DATABASE_URL.
 */
function connect(): Neon {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set — see .env.example");
    client = neon(url);
  }
  return client;
}

export const sql = new Proxy((() => {}) as unknown as Neon, {
  apply: (_t, _this, args) => Reflect.apply(connect() as never, undefined, args),
  get: (_t, prop) => Reflect.get(connect() as never, prop),
});

type FoodRow = {
  id: number; name: string; brand: string | null; barcode: string | null;
  kcal_100g: number; protein_100g: number; carb_100g: number; fat_100g: number;
  fiber_100g: number | null; source: Food["source"];
};

const toFood = (r: FoodRow, servings: Serving[] = []): Food => ({
  id: Number(r.id), name: r.name, brand: r.brand, barcode: r.barcode,
  kcal: r.kcal_100g, protein: r.protein_100g, carb: r.carb_100g,
  fat: r.fat_100g, fiber: r.fiber_100g, source: r.source, servings,
});

async function withServings(rows: FoodRow[]): Promise<Food[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => Number(r.id));
  const servings = (await sql`
    SELECT id, food_id, label, grams FROM food_servings
     WHERE food_id = ANY(${ids}) ORDER BY position, id`) as
    { id: number; food_id: number; label: string; grams: number }[];
  const byFood = new Map<number, Serving[]>();
  for (const s of servings) {
    const list = byFood.get(Number(s.food_id)) ?? [];
    list.push({ id: Number(s.id), label: s.label, grams: s.grams });
    byFood.set(Number(s.food_id), list);
  }
  // No cups, spoons or ounces reach the app: see lib/servings.ts.
  return rows.map((r) => toFood(r, usableServings(byFood.get(Number(r.id)) ?? [])));
}

/* ------------------------------------------------------------------- day */

/**
 * One day's meals, in order: the four standards first — drawn whether or not a
 * row exists for them — then anything added on that day. `day` is the phone's
 * own local date; nothing here asks Postgres what today is.
 */
export async function getDay(day: string): Promise<Meal[]> {
  const rows = (await sql`
    SELECT m.id, m.name, m.sort_index,
           e.id AS entry_id, e.food_id, e.name AS entry_name, e.brand, e.grams,
           e.serving_label, e.serving_qty,
           e.kcal_100g, e.protein_100g, e.carb_100g, e.fat_100g, e.fiber_100g
      FROM day_meals m
      LEFT JOIN entries e ON e.day_meal_id = m.id
     WHERE m.day = ${day}
     ORDER BY m.sort_index, m.id, e.created_at, e.id`) as Record<string, never>[];

  const meals = new Map<string, Meal>();
  for (const name of STANDARD_MEALS) {
    meals.set(name, { id: null, name, sortIndex: STANDARD_MEALS.indexOf(name), entries: [] });
  }
  for (const r of rows as unknown as {
    id: number; name: string; sort_index: number; entry_id: number | null;
    food_id: number | null; entry_name: string; brand: string | null; grams: number;
    serving_label: string | null; serving_qty: number | null;
    kcal_100g: number; protein_100g: number; carb_100g: number;
    fat_100g: number; fiber_100g: number | null;
  }[]) {
    const meal = meals.get(r.name) ?? { id: null, name: r.name, sortIndex: r.sort_index, entries: [] };
    meal.id = Number(r.id);
    meal.sortIndex = r.sort_index;
    if (r.entry_id !== null) {
      meal.entries.push({
        id: Number(r.entry_id), foodId: r.food_id === null ? null : Number(r.food_id),
        name: r.entry_name, brand: r.brand, grams: r.grams,
        servingLabel: r.serving_label, servingQty: r.serving_qty,
        kcal: r.kcal_100g, protein: r.protein_100g, carb: r.carb_100g,
        fat: r.fat_100g, fiber: r.fiber_100g,
      });
    }
    meals.set(r.name, meal);
  }
  return [...meals.values()].sort((a, b) => a.sortIndex - b.sortIndex || a.name.localeCompare(b.name));
}

/** The meal row for (day, name), created only now that something goes in it. */
export async function findOrCreateMeal(day: string, name: string): Promise<number> {
  const sortIndex = STANDARD_MEALS.indexOf(name as (typeof STANDARD_MEALS)[number]);
  const [row] = (await sql`
    INSERT INTO day_meals (day, name, sort_index)
    VALUES (${day}, ${name}, ${sortIndex === -1 ? 100 : sortIndex})
    ON CONFLICT (day, name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id`) as { id: number }[];
  return Number(row.id);
}

export async function addEntry(
  day: string, mealName: string, food: Omit<Entry, "id">,
): Promise<number> {
  const mealId = await findOrCreateMeal(day, mealName);
  const [row] = (await sql`
    INSERT INTO entries
      (day_meal_id, food_id, name, brand, grams, serving_label, serving_qty,
       kcal_100g, protein_100g, carb_100g, fat_100g, fiber_100g)
    VALUES (${mealId}, ${food.foodId}, ${food.name}, ${food.brand}, ${food.grams},
            ${food.servingLabel}, ${food.servingQty},
            ${food.kcal}, ${food.protein}, ${food.carb}, ${food.fat}, ${food.fiber})
    RETURNING id`) as { id: number }[];
  return Number(row.id);
}

export async function updateEntryPortion(entryId: number, p: Portion): Promise<void> {
  await sql`
    UPDATE entries SET grams = ${p.grams}, serving_label = ${p.servingLabel},
                       serving_qty = ${p.servingQty}
     WHERE id = ${entryId}`;
}

/** One entry, with the day and meal it sits in — the edit screen. */
export async function getEntry(entryId: number): Promise<(Entry & { day: string; meal: string }) | null> {
  const rows = (await sql`
    SELECT e.*, to_char(m.day, 'YYYY-MM-DD') AS day, m.name AS meal
      FROM entries e JOIN day_meals m ON m.id = e.day_meal_id
     WHERE e.id = ${entryId}`) as Record<string, never>[];
  const r = rows[0] as unknown as {
    id: number; food_id: number | null; name: string; brand: string | null; grams: number;
    serving_label: string | null; serving_qty: number | null; day: string; meal: string;
    kcal_100g: number; protein_100g: number; carb_100g: number; fat_100g: number; fiber_100g: number | null;
  } | undefined;
  if (!r) return null;
  return {
    id: Number(r.id), foodId: r.food_id === null ? null : Number(r.food_id),
    name: r.name, brand: r.brand, grams: r.grams,
    servingLabel: r.serving_label, servingQty: r.serving_qty,
    kcal: r.kcal_100g, protein: r.protein_100g, carb: r.carb_100g,
    fat: r.fat_100g, fiber: r.fiber_100g, day: r.day, meal: r.meal,
  };
}

/** How he portioned this food the last time he logged it, if ever. */
export async function getLastPortion(foodId: number): Promise<Portion | null> {
  const rows = (await sql`
    SELECT grams, serving_label, serving_qty FROM entries
     WHERE food_id = ${foodId} ORDER BY created_at DESC, id DESC LIMIT 1`) as
    { grams: number; serving_label: string | null; serving_qty: number | null }[];
  const r = rows[0];
  return r ? { grams: r.grams, servingLabel: r.serving_label, servingQty: r.serving_qty } : null;
}

/** Which of these days have anything logged — the dots on the week strip. */
export async function getLoggedDaysBetween(from: string, to: string): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT to_char(m.day, 'YYYY-MM-DD') AS day
      FROM day_meals m JOIN entries e ON e.day_meal_id = m.id
     WHERE m.day BETWEEN ${from} AND ${to}`) as { day: string }[];
  return rows.map((r) => r.day);
}

export async function deleteEntry(entryId: number): Promise<void> {
  await sql`DELETE FROM entries WHERE id = ${entryId}`;
}

export async function deleteMeal(mealId: number): Promise<void> {
  await sql`DELETE FROM day_meals WHERE id = ${mealId}`;
}

/** Days that have anything logged, newest first — the History screen. */
export type DaySummary = { day: string; kcal: number; protein: number; carb: number; fat: number };

export async function getLoggedDays(limit = 60): Promise<DaySummary[]> {
  const rows = (await sql`
    SELECT to_char(m.day, 'YYYY-MM-DD') AS day,
           sum(e.grams * e.kcal_100g / 100)    AS kcal,
           sum(e.grams * e.protein_100g / 100) AS protein,
           sum(e.grams * e.carb_100g / 100)    AS carb,
           sum(e.grams * e.fat_100g / 100)     AS fat
      FROM day_meals m JOIN entries e ON e.day_meal_id = m.id
     GROUP BY m.day ORDER BY m.day DESC LIMIT ${limit}`) as Record<string, string>[];
  return rows.map((r) => ({
    day: r.day, kcal: Number(r.kcal), protein: Number(r.protein),
    carb: Number(r.carb), fat: Number(r.fat),
  }));
}

/* ----------------------------------------------------------------- foods */

/** Most-logged first, then most recent — what the add screen opens on. */
export async function getRecentFoods(limit = 20): Promise<RecentFood[]> {
  const rows = (await sql`
    SELECT f.*, last.grams AS last_grams, last.serving_label AS last_label,
           last.serving_qty AS last_qty
      FROM (SELECT food_id, count(*) AS uses, max(created_at) AS last_used
              FROM entries
             WHERE food_id IS NOT NULL AND created_at > now() - interval '60 days'
             GROUP BY food_id) u
      JOIN foods f ON f.id = u.food_id
      CROSS JOIN LATERAL (
        SELECT grams, serving_label, serving_qty FROM entries
         WHERE food_id = u.food_id ORDER BY created_at DESC, id DESC LIMIT 1) last
     ORDER BY u.uses DESC, u.last_used DESC
     LIMIT ${limit}`) as (FoodRow & { last_grams: number; last_label: string | null; last_qty: number | null })[];
  const foods = await withServings(rows);
  return foods.map((f, i) => ({
    ...f,
    last: { grams: rows[i].last_grams, servingLabel: rows[i].last_label, servingQty: rows[i].last_qty },
  }));
}

export async function searchFoods(query: string, limit = 40): Promise<Food[]> {
  const q = query.trim();
  if (!q) return [];
  const rows = (await sql`
    SELECT * FROM foods
     WHERE name ILIKE ${"%" + q + "%"} OR brand ILIKE ${"%" + q + "%"}
     ORDER BY
       -- A name that starts with what he typed beats one that merely contains it.
       (lower(name) LIKE ${q.toLowerCase() + "%"}) DESC,
       length(name), name
     LIMIT ${limit}`) as FoodRow[];
  return withServings(rows);
}

export async function getFood(id: number): Promise<Food | null> {
  const rows = (await sql`SELECT * FROM foods WHERE id = ${id}`) as FoodRow[];
  if (!rows.length) return null;
  return (await withServings(rows))[0];
}

export async function getFoodByBarcode(barcode: string): Promise<Food | null> {
  const rows = (await sql`SELECT * FROM foods WHERE barcode = ${barcode}`) as FoodRow[];
  if (!rows.length) return null;
  return (await withServings(rows))[0];
}

/** Foods he made or scanned in — the library screen, USDA rows excluded. */
export async function getMyFoods(): Promise<Food[]> {
  const rows = (await sql`
    SELECT * FROM foods WHERE source <> 'usda' ORDER BY created_at DESC`) as FoodRow[];
  return withServings(rows);
}

export async function createFood(f: {
  name: string; brand: string | null; barcode: string | null;
  kcal: number; protein: number; carb: number; fat: number; fiber: number | null;
  source: Food["source"]; servings?: { label: string; grams: number }[];
}): Promise<number> {
  const [row] = (await sql`
    INSERT INTO foods (name, brand, barcode, kcal_100g, protein_100g, carb_100g,
                       fat_100g, fiber_100g, source)
    VALUES (${f.name}, ${f.brand}, ${f.barcode}, ${f.kcal}, ${f.protein},
            ${f.carb}, ${f.fat}, ${f.fiber}, ${f.source})
    ON CONFLICT (barcode) WHERE barcode IS NOT NULL
      DO UPDATE SET name = EXCLUDED.name
    RETURNING id`) as { id: number }[];
  const id = Number(row.id);
  for (const [i, s] of (f.servings ?? []).entries()) {
    await sql`
      INSERT INTO food_servings (food_id, label, grams, position)
      VALUES (${id}, ${s.label}, ${s.grams}, ${i})`;
  }
  return id;
}

export async function updateFood(id: number, f: {
  name: string; brand: string | null;
  kcal: number; protein: number; carb: number; fat: number; fiber: number | null;
  servings: { label: string; grams: number }[];
}): Promise<void> {
  // Entries keep their own serving label, so replacing the list rewrites nothing logged.
  await sql`DELETE FROM food_servings WHERE food_id = ${id}`;
  for (const [i, s] of f.servings.entries()) {
    await sql`
      INSERT INTO food_servings (food_id, label, grams, position)
      VALUES (${id}, ${s.label}, ${s.grams}, ${i})`;
  }
  // Entries carry their own snapshot, so this never rewrites what was logged.
  await sql`
    UPDATE foods
       SET name = ${f.name}, brand = ${f.brand}, kcal_100g = ${f.kcal},
           protein_100g = ${f.protein}, carb_100g = ${f.carb},
           fat_100g = ${f.fat}, fiber_100g = ${f.fiber}
     WHERE id = ${id}`;
}

export async function deleteFood(id: number): Promise<void> {
  await sql`DELETE FROM foods WHERE id = ${id}`;
}

export type Targets = { protein: number | null; carb: number | null; fat: number | null };

export async function getTargets(): Promise<Targets> {
  const rows = (await sql`SELECT protein, carb, fat FROM targets WHERE id = 1`) as Targets[];
  return rows[0] ?? { protein: null, carb: null, fat: null };
}

export async function saveTargets(t: Targets): Promise<void> {
  await sql`
    INSERT INTO targets (id, protein, carb, fat) VALUES (1, ${t.protein}, ${t.carb}, ${t.fat})
    ON CONFLICT (id) DO UPDATE SET protein = excluded.protein, carb = excluded.carb, fat = excluded.fat`;
}
