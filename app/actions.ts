"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import { lookupBarcode } from "@/lib/off";
import type { Food } from "@/lib/types";

/* Every action takes the day as a string the phone worked out for itself.
   Nothing here asks Postgres what today is — Vercel runs UTC. */

export async function logFood(formData: FormData) {
  const day = String(formData.get("day"));
  const meal = String(formData.get("meal"));
  const foodId = Number(formData.get("foodId"));
  const grams = Number(formData.get("grams"));
  if (!day || !meal || !Number.isFinite(grams) || grams <= 0) return;

  const food = await db.getFood(foodId);
  if (!food) return;

  // The entry takes a copy of the macros. Editing the food later must not
  // rewrite what he ate — see db/schema.sql.
  await db.addEntry(day, meal, {
    foodId: food.id, name: food.name, brand: food.brand, grams,
    kcal: food.kcal, protein: food.protein, carb: food.carb,
    fat: food.fat, fiber: food.fiber,
  });
  revalidatePath("/");
  redirect(`/?d=${day}`);
}

export async function removeEntry(formData: FormData) {
  await db.deleteEntry(Number(formData.get("entryId")));
  revalidatePath("/");
}

export async function changeGrams(formData: FormData) {
  const grams = Number(formData.get("grams"));
  if (Number.isFinite(grams) && grams > 0) {
    await db.updateEntryGrams(Number(formData.get("entryId")), grams);
  }
  revalidatePath("/");
}

export async function addMeal(formData: FormData) {
  const day = String(formData.get("day"));
  const name = String(formData.get("name") ?? "").trim();
  if (!day || !name) return;
  await db.findOrCreateMeal(day, name);
  revalidatePath("/");
}

export async function removeMeal(formData: FormData) {
  await db.deleteMeal(Number(formData.get("mealId")));
  revalidatePath("/");
}

/** Saves a food typed in by hand, or one prefilled from a scan. */
export async function saveFood(formData: FormData) {
  const num = (k: string) => {
    const v = Number(String(formData.get(k) ?? "").replace(",", "."));
    return Number.isFinite(v) ? v : 0;
  };
  const rawFiber = String(formData.get("fiber") ?? "").trim();

  const id = await db.createFood({
    name: String(formData.get("name") ?? "").trim() || "Unnamed food",
    brand: String(formData.get("brand") ?? "").trim() || null,
    barcode: String(formData.get("barcode") ?? "").trim() || null,
    kcal: num("kcal"), protein: num("protein"), carb: num("carb"), fat: num("fat"),
    // Left blank means "I don't know", which is not the same as zero.
    fiber: rawFiber === "" ? null : Number(rawFiber.replace(",", ".")),
    source: formData.get("barcode") ? "off" : "manual",
  });

  const day = String(formData.get("day") ?? "");
  const meal = String(formData.get("meal") ?? "");
  revalidatePath("/foods");
  if (day && meal) redirect(`/add/${id}?d=${day}&meal=${encodeURIComponent(meal)}`);
  redirect("/foods");
}

export async function editFood(formData: FormData) {
  const num = (k: string) => Number(String(formData.get(k) ?? "").replace(",", ".")) || 0;
  const rawFiber = String(formData.get("fiber") ?? "").trim();
  await db.updateFood(Number(formData.get("foodId")), {
    name: String(formData.get("name") ?? "").trim() || "Unnamed food",
    brand: String(formData.get("brand") ?? "").trim() || null,
    kcal: num("kcal"), protein: num("protein"), carb: num("carb"), fat: num("fat"),
    fiber: rawFiber === "" ? null : Number(rawFiber.replace(",", ".")),
  });
  revalidatePath("/foods");
  redirect("/foods");
}

export async function removeFood(formData: FormData) {
  await db.deleteFood(Number(formData.get("foodId")));
  revalidatePath("/foods");
}

/**
 * What the scanner calls. Checks his own library first — a barcode he has
 * scanned before never leaves the server — then Open Food Facts.
 */
export async function resolveBarcode(barcode: string): Promise<
  { status: "known"; food: Food } |
  { status: "found"; product: NonNullable<Awaited<ReturnType<typeof lookupBarcode>>> } |
  { status: "unknown" }
> {
  const known = await db.getFoodByBarcode(barcode);
  if (known) return { status: "known", food: known };

  const product = await lookupBarcode(barcode);
  if (!product) return { status: "unknown" };
  return { status: "found", product };
}

/**
 * Takes an Open Food Facts hit into his own library, then goes straight to the
 * portion step. From here on that barcode resolves locally — OFF is asked once.
 */
export async function adoptOffProduct(formData: FormData) {
  const barcode = String(formData.get("barcode") ?? "").trim();
  const day = String(formData.get("day") ?? "");
  const meal = String(formData.get("meal") ?? "");
  const num = (k: string) => Number(formData.get(k)) || 0;
  const rawFiber = String(formData.get("fiber") ?? "").trim();
  const servingGrams = Number(formData.get("servingGrams"));

  const existing = barcode ? await db.getFoodByBarcode(barcode) : null;
  const id = existing?.id ?? await db.createFood({
    name: String(formData.get("name") ?? "").trim() || "Unnamed food",
    brand: String(formData.get("brand") ?? "").trim() || null,
    barcode: barcode || null,
    kcal: num("kcal"), protein: num("protein"), carb: num("carb"), fat: num("fat"),
    fiber: rawFiber === "" ? null : Number(rawFiber),
    source: "off",
    servings: Number.isFinite(servingGrams) && servingGrams > 0
      ? [{ label: "1 serving", grams: servingGrams }]
      : [],
  });

  redirect(`/add/${id}?d=${day}&meal=${encodeURIComponent(meal)}`);
}

/** The add screen's search box: bundled foods first, then Open Food Facts. */
export async function searchEverything(query: string) {
  const { searchProducts } = await import("@/lib/off");
  const [mine, off] = await Promise.all([
    db.searchFoods(query),
    query.trim().length >= 3 ? searchProducts(query) : Promise.resolve([]),
  ]);
  const seen = new Set(mine.map((f) => f.barcode).filter(Boolean));
  return {
    mine,
    off: off.filter((p) => !seen.has(p.barcode)).slice(0, 10),
  };
}

/** Blank means no target for that macro, not a target of zero. */
export async function saveTargets(formData: FormData) {
  const target = (k: string) => {
    const n = Number(String(formData.get(k) ?? "").trim().replace(",", "."));
    return String(formData.get(k) ?? "").trim() && Number.isFinite(n) && n > 0 ? n : null;
  };
  await db.saveTargets({ protein: target("protein"), carb: target("carb"), fat: target("fat") });
  revalidatePath("/");
  const day = String(formData.get("day") ?? "");
  redirect(day ? `/?d=${day}` : "/");
}
