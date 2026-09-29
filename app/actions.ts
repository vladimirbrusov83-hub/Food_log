"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as db from "@/lib/db";
import { lookupBarcode } from "@/lib/off";
import type { Food, Portion } from "@/lib/types";

/* Every action takes the day as a string the phone worked out for itself.
   Nothing here asks Postgres what today is — Vercel runs UTC. */

/** The portion a form sent: grams always, the serving it came from when there was one. */
function readPortion(formData: FormData): Portion | null {
  const grams = Number(String(formData.get("grams") ?? "").replace(",", "."));
  if (!Number.isFinite(grams) || grams <= 0) return null;
  const label = String(formData.get("servingLabel") ?? "").trim();
  const qty = Number(formData.get("servingQty"));
  return label && Number.isFinite(qty) && qty > 0
    ? { grams, servingLabel: label, servingQty: qty }
    : { grams, servingLabel: null, servingQty: null };
}

async function logPortion(day: string, meal: string, foodId: number, portion: Portion) {
  const food = await db.getFood(foodId);
  if (!food) return null;
  // The entry takes a copy of the macros. Editing the food later must not
  // rewrite what he ate — see db/schema.sql.
  return db.addEntry(day, meal, {
    foodId: food.id, name: food.name, brand: food.brand, ...portion,
    kcal: food.kcal, protein: food.protein, carb: food.carb,
    fat: food.fat, fiber: food.fiber,
  });
}

export async function logFood(formData: FormData) {
  const day = String(formData.get("day"));
  const meal = String(formData.get("meal"));
  const portion = readPortion(formData);
  if (!day || !meal || !portion) return;
  await logPortion(day, meal, Number(formData.get("foodId")), portion);
  revalidatePath("/");
  redirect(`/?d=${day}`);
}

/** The "+" on a recent food: the same portion as last time, no questions. */
export async function quickAdd(formData: FormData) {
  const day = String(formData.get("day"));
  const meal = String(formData.get("meal"));
  const portion = readPortion(formData);
  if (!day || !meal || !portion) return;
  const id = await logPortion(day, meal, Number(formData.get("foodId")), portion);
  revalidatePath("/");
  // Back to the add screen, which shows what went in and offers Undo.
  redirect(`/add?d=${day}&meal=${encodeURIComponent(meal)}${id ? `&added=${id}` : ""}`);
}

export async function undoQuickAdd(formData: FormData) {
  await db.deleteEntry(Number(formData.get("entryId")));
  revalidatePath("/");
  const day = String(formData.get("day"));
  redirect(`/add?d=${day}&meal=${encodeURIComponent(String(formData.get("meal")))}`);
}

export async function updateEntry(formData: FormData) {
  const portion = readPortion(formData);
  if (portion) await db.updateEntryPortion(Number(formData.get("entryId")), portion);
  revalidatePath("/");
  redirect(`/?d=${String(formData.get("day"))}`);
}

export async function removeEntry(formData: FormData) {
  await db.deleteEntry(Number(formData.get("entryId")));
  revalidatePath("/");
  const day = String(formData.get("day") ?? "");
  if (day) redirect(`/?d=${day}`);
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

/**
 * The food form, read once for create, edit and the scanner. Labels are
 * usually printed per serving, so the numbers can come in either way; they
 * are stored per 100 g regardless.
 */
function readFoodForm(formData: FormData) {
  const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").trim().replace(",", "."));
  const labels = formData.getAll("servingLabel").map((v) => String(v).trim());
  const grams = formData.getAll("servingGrams").map(num);
  const servings = labels
    .map((label, i) => ({ label: label || "1 serving", grams: grams[i] }))
    .filter((s) => Number.isFinite(s.grams) && s.grams > 0);

  // "serving" means the numbers are for the first serving in the list.
  const basisGrams = formData.get("basis") === "serving" && servings[0] ? servings[0].grams : 100;
  const per100 = (k: string) => {
    const v = num(formData.get(k));
    return Number.isFinite(v) && v >= 0 ? (v * 100) / basisGrams : 0;
  };
  const rawFiber = String(formData.get("fiber") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim() || "Unnamed food",
    brand: String(formData.get("brand") ?? "").trim() || null,
    kcal: per100("kcal"), protein: per100("protein"), carb: per100("carb"), fat: per100("fat"),
    // Left blank means "I don't know", which is not the same as zero.
    fiber: rawFiber === "" ? null : per100("fiber"),
    servings,
  };
}

/** Saves a food typed in by hand, or one the scanner could not find anywhere. */
export async function saveFood(formData: FormData) {
  const barcode = String(formData.get("barcode") ?? "").trim() || null;
  const id = await db.createFood({
    ...readFoodForm(formData), barcode, source: barcode ? "off" : "manual",
  });

  const day = String(formData.get("day") ?? "");
  const meal = String(formData.get("meal") ?? "");
  revalidatePath("/foods");
  if (day && meal) redirect(`/add/${id}?d=${day}&meal=${encodeURIComponent(meal)}`);
  redirect("/foods");
}

export async function editFood(formData: FormData) {
  await db.updateFood(Number(formData.get("foodId")), readFoodForm(formData));
  revalidatePath("/foods");
  redirect("/foods");
}

export async function removeFood(formData: FormData) {
  await db.deleteFood(Number(formData.get("foodId")));
  revalidatePath("/foods");
  redirect("/foods");
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
  let servingGrams = Number(formData.get("servingGrams"));
  let servingLabel = String(formData.get("servingLabel") ?? "").trim();
  // Search results carry no serving size; the product itself does. One call, once.
  if (barcode && !(servingGrams > 0)) {
    const full = await lookupBarcode(barcode);
    if (full?.servingGrams) { servingGrams = full.servingGrams; servingLabel = full.servingLabel; }
  }

  const existing = barcode ? await db.getFoodByBarcode(barcode) : null;
  const id = existing?.id ?? await db.createFood({
    name: String(formData.get("name") ?? "").trim() || "Unnamed food",
    brand: String(formData.get("brand") ?? "").trim() || null,
    barcode: barcode || null,
    kcal: num("kcal"), protein: num("protein"), carb: num("carb"), fat: num("fat"),
    fiber: rawFiber === "" ? null : Number(rawFiber),
    source: "off",
    servings: Number.isFinite(servingGrams) && servingGrams > 0
      ? [{ label: servingLabel || "1 serving", grams: servingGrams }]
      : [],
  });

  redirect(`/add/${id}?d=${day}&meal=${encodeURIComponent(meal)}`);
}

/** The add screen's search box: the library first, then Open Food Facts. A store narrows both to that shop. */
export async function searchEverything(query: string, store: string | null = null) {
  const { searchProducts } = await import("@/lib/off");
  const [mine, off] = await Promise.all([
    db.searchFoods(query, 40, store),
    !store && query.trim().length >= 3 ? searchProducts(query) : Promise.resolve([]),
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

/** A store's most-scanned products, for browsing that store on the add screen. */
export async function browseStore(store: string) {
  return db.getStoreFoods(store, 80);
}
