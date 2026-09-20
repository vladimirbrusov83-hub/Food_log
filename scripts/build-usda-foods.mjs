/**
 * Turns the USDA SR Legacy bulk download into db/usda-foods.json — the food
 * library that ships with the app.
 *
 *   node scripts/build-usda-foods.mjs [path-to-sr-legacy.json]
 *
 * Run once, by hand. The USDA file is ~200 MB and is NOT checked in; only the
 * small JSON it produces is. SR Legacy is public domain, so nothing here needs
 * an API key and no key ever reaches the browser.
 *
 * Each row in db/food-list.mjs names a food the way a person searches for it
 * and lists terms that find it in the USDA descriptions. This script resolves
 * each to the SHORTEST matching description — USDA's short entries are the
 * plain ones ("Broccoli, raw") and its long ones are the variants nobody wants
 * ("...trimmed to 1/8" fat, all grades, cooked, braised"). Anything that does
 * not resolve is printed, loudly, and left out rather than guessed at.
 */
import fs from "node:fs";
import path from "node:path";
import { FOODS } from "../db/food-list.mjs";

const SRC = process.argv[2] ??
  "/private/tmp/claude-501/-Users-brusov/9e85cf00-8b1d-444c-a14b-98be329dac49/scratchpad/FoodData_Central_sr_legacy_food_json_2021-10-28.json";
const OUT = path.join(import.meta.dirname, "..", "db", "usda-foods.json");

if (!fs.existsSync(SRC)) {
  console.error(
    `USDA data not found at ${SRC}\n` +
    "Download it first:\n" +
    "  curl -LO https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2021-10-28.zip\n" +
    "then unzip it and pass the .json path as an argument.",
  );
  process.exit(1);
}

const NUTRIENT = { kcal: 1008, kj: 1062, protein: 1003, carb: 1005, fat: 1004, fiber: 1079 };

/** Portions worth offering as a tap-target. USDA also lists things like
 *  "1 cubic inch" and "1 oz, boneless, cooked" — noise on a phone. */
const GOOD_PORTION = /^(\d+(\.\d+)? )?(cup|tbsp|tablespoon|tsp|teaspoon|slice|piece|medium|large|small|egg|fillet|breast|thigh|serving|scoop|clove|link|patty|bar|package)/i;

const OUNCE = 28.3495;

/**
 * Turns one USDA portion into a chip.
 *
 * SR Legacy usually omits `amount`, so a 113 g portion arrives labelled just
 * "oz" — which would put 113 g behind a chip that reads like one ounce. For a
 * real weight unit the count is recoverable from the grams, so it is: 113 →
 * "4 oz". When it does not divide cleanly the portion is dropped rather than
 * shown with a label that lies. Volume units (cup, tbsp) are left alone —
 * a cup of oil and a cup of flour weigh different amounts, and that is the
 * portion's whole point.
 */
function label(p) {
  const grams = Math.round(p.gramWeight * 10) / 10;
  const unit = String(p.modifier ?? p.measureUnit?.name ?? "").trim();
  // "cup, dry, yields" is a conversion, not a portion: the grams are what a cup
  // of the dry food becomes once cooked, which is not what a chip should offer.
  if (!unit || /^undetermined/i.test(unit) || /yields/i.test(unit)) return null;

  const amount = typeof p.amount === "number" && p.amount > 0 ? p.amount : null;

  if (/^oz\b/i.test(unit) && !/fl/i.test(unit)) {
    const count = amount ?? grams / OUNCE;
    const whole = Math.round(count);
    // Within 5% of a whole number of ounces, or it is something else entirely.
    if (whole < 1 || Math.abs(count - whole) / whole > 0.05) return null;
    return { label: `${whole} oz`, grams };
  }

  const text = [amount && amount !== 1 ? amount : null, unit].filter(Boolean).join(" ");
  if (!GOOD_PORTION.test(text)) return null;
  return { label: text, grams };
}

const raw = JSON.parse(fs.readFileSync(SRC, "utf8"));
const all = raw.SRLegacyFoods ?? raw.FoundationFoods ?? Object.values(raw)[0];
const indexed = all.map((f) => ({ f, lower: f.description.toLowerCase() }));

function amount(food, nutrientId) {
  const n = food.foodNutrients.find((x) => x.nutrient?.id === nutrientId);
  return typeof n?.amount === "number" ? n.amount : null;
}

function resolve(terms, categoryHint) {
  // A term starting with "!" must NOT appear. Shortest-match is usually right,
  // but "sour cream, cultured" finds the imitation one first — a negation is
  // how you say "the real one" without pinning the whole description.
  const need = terms.filter((t) => !t.startsWith("!")).map((t) => t.toLowerCase());
  const avoid = terms.filter((t) => t.startsWith("!")).map((t) => t.slice(1).toLowerCase());
  let pool = indexed.filter(({ lower }) =>
    need.every((t) => lower.includes(t)) && !avoid.some((t) => lower.includes(t)));
  // The hint narrows a term set that matches in two aisles ("cream, heavy" as a
  // dairy row and as an ingredient in a dessert). It is only ever a preference.
  if (categoryHint) {
    const hinted = pool.filter(({ f }) => f.foodCategory?.description === categoryHint);
    if (hinted.length) pool = hinted;
  }
  if (!pool.length) return null;
  pool.sort((a, b) => a.f.description.length - b.f.description.length);
  return pool[0].f;
}

const out = [];
const missing = [];

for (const [name, terms, categoryHint] of FOODS) {
  const food = resolve(terms, categoryHint);
  if (!food) { missing.push([name, terms]); continue; }

  let kcal = amount(food, NUTRIENT.kcal);
  // Some rows carry only kilojoules. 4.184 kJ per kcal.
  if (kcal === null) {
    const kj = amount(food, NUTRIENT.kj);
    if (kj !== null) kcal = kj / 4.184;
  }
  const protein = amount(food, NUTRIENT.protein);
  const carb = amount(food, NUTRIENT.carb);
  const fat = amount(food, NUTRIENT.fat);
  if (kcal === null || protein === null || carb === null || fat === null) {
    missing.push([name, terms, `matched "${food.description}" but is missing a core macro`]);
    continue;
  }

  const servings = (food.foodPortions ?? [])
    .filter((p) => p.gramWeight > 0)
    .map((p) => label(p))
    .filter((s) => s !== null)
    .slice(0, 3);

  const round = (n) => Math.round(n * 10) / 10;
  out.push({
    name,
    usda: food.description,
    kcal: Math.round(kcal),
    protein: round(protein),
    carb: round(carb),
    fat: round(fat),
    // null, never 0, when USDA did not measure fiber for this food.
    fiber: amount(food, NUTRIENT.fiber) === null ? null : round(amount(food, NUTRIENT.fiber)),
    servings,
  });
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`${out.length} foods written to db/usda-foods.json`);
if (missing.length) {
  console.log(`\n${missing.length} did not resolve — fix the terms in db/food-list.mjs:`);
  for (const [name, terms, why] of missing) {
    console.log(`  ${name.padEnd(36)} [${terms.join(", ")}]${why ? ` — ${why}` : ""}`);
  }
}
