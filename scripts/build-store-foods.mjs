// Builds db/store-foods.json: the store-brand products he actually buys —
// Aldi, Walmart, Schnucks — from Open Food Facts, each with the serving size
// printed on its pack ("1 container = 170 g").
//
//   curl -L -o /tmp/off.csv.gz https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
//   npm run build:store-foods -- /tmp/off.csv.gz        (~1.3 GB download, ~5 min to scan)
//
// It reads OFF's full nightly CSV export rather than the API: the search API
// 503s under load and has no serving sizes, and the product API rate-limits
// long before a few thousand products. Then `npm run db:push` loads the JSON.
// OFF data is ODbL. Never read the output into an AI context — thousands of rows.
import { createReadStream, writeFileSync } from "node:fs";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";

const UA = "FoodLog/1.0 (personal food tracker; vladimirbrusov83@gmail.com)";

/** Store → its own brands, as OFF brand tags, and how many of the most-scanned to take. */
const STORES = {
  Aldi: [
    ["aldi", 800], ["friendly-farms", 250], ["simply-nature", 300], ["millville", 150],
    ["kirkwood", 60], ["happy-farms", 70], ["elevation", 40], ["fit-active", 60],
    ["specially-selected", 150], ["southern-grove", 150], ["never-any", 30],
    ["appleton-farms", 20], ["season-s-choice", 100], ["l-oven-fresh", 60],
    ["countryside-creamery", 10], ["goldhen", 14], ["priano", 80], ["earth-grown", 16],
    ["park-street-deli", 50], ["clancy-s", 120], ["benton-s", 100], ["chef-s-cupboard", 20],
    ["casa-mamita", 30], ["stonemill", 80], ["baker-s-corner", 60], ["carlini", 12],
    ["nature-s-nectar", 80], ["barissimo", 20], ["sundae-shoppe", 40], ["choceur", 60],
  ],
  Walmart: [
    ["great-value", 1500], ["walmart", 200], ["marketside", 300], ["sam-s-choice", 120],
    ["bettergoods", 120], ["freshness-guaranteed", 11],
  ],
  Schnucks: [["schnucks", 945]],
};

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(+v) ? +v : null);

/** ALL CAPS NAMES → Title Case; anything already mixed-case is left alone. */
function tidyName(s) {
  s = s.replace(/\s+/g, " ").trim();
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\b(Of|And|With|In|The|A)\b/g, (w) => w.toLowerCase()).replace(/^./, (c) => c.toUpperCase());
}

/** Volume and imperial words: a label made of them becomes "1 serving". Same list as lib/servings.ts. */
const DROP = /\b(cups?|oz|onz|oza|ozs|ounces?|fl|lbs?|pints?|quarts?|gallons?|tbsp|tablespoons?|tsp|teaspoons?|ml|l)\b/i;

/** "1 container (170g)" → "1 container". Anything else — "2/3 cup (170g)",
 *  "6 onz", "11 crackers" — is just "1 serving"; the grams carry the meaning. */
function servingLabel(text) {
  const before = String(text ?? "").split("(")[0].replace(/\d+(?:[.,]\d+)?\s*(g|ml)\b/gi, "").trim().toLowerCase();
  if (!before || DROP.test(before) || /["″/]/.test(before)) return "1 serving";
  const m = before.match(/^(?:1\s+)?([a-z][a-z ]{1,20})$/);
  if (!m || /\b(serving|portion|unit|size)\b/.test(m[1])) return "1 serving";
  return `1 ${m[1].trim()}`;
}

/** "5.3 oz (150g)", "150 g", "32 oz" → grams when they are written in grams. */
function packGrams(q) {
  const m = String(q ?? "").match(/(\d+(?:[.,]\d+)?)\s*g\b/i);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

function toFood(p, store, brandFallback) {
  const n = p.nutriments ?? {};
  let kcal = num(n["energy-kcal_100g"]);
  if (kcal === null) { const kj = num(n["energy-kj_100g"]) ?? num(n["energy_100g"]); if (kj !== null) kcal = kj / 4.184; }
  const protein = num(n.proteins_100g), carb = num(n.carbohydrates_100g), fat = num(n.fat_100g);
  const name = tidyName(String(p.product_name ?? ""));
  if (!name || name.length < 3 || kcal === null || protein === null || carb === null || fat === null) return null;
  if (kcal < 0 || kcal > 902 || protein < 0 || carb < 0 || fat < 0 || protein + carb + fat > 101) return null;
  // Energy has to roughly agree with the macros, or a digit was typed wrong somewhere.
  const est = protein * 4 + carb * 4 + fat * 9;
  if (Math.abs(est - kcal) > Math.max(40, kcal * 0.3)) return null;

  const servings = [];
  const sq = num(p.serving_quantity);
  const unit = String(p.serving_quantity_unit ?? "g").toLowerCase();
  // Over 500 g is a whole tub someone typed as the serving, not a serving.
  if (sq && sq > 0 && sq <= 500 && (unit === "g" || unit === "ml")) {
    servings.push({ label: servingLabel(p.serving_size), grams: Math.round(sq * 10) / 10 });
  }
  // A single-serve pack (a yogurt cup, a bar) is worth its own button.
  const pack = packGrams(p.quantity);
  if (pack && pack <= 400 && !servings.some((s) => Math.abs(s.grams - pack) / pack < 0.05)) {
    servings.push({ label: "1 pack", grams: pack });
  }

  const brands = Array.isArray(p.brands) ? p.brands : String(p.brands ?? "").split(",");
  const brand = brands.map((b) => String(b).trim()).find((b) => b && !/^(aldi|walmart|schnucks)$/i.test(b)) ?? brandFallback;
  const fiber = num(n.fiber_100g);
  const r1 = (x) => Math.round(x * 10) / 10;
  return {
    barcode: String(p.code), store, brand, name,
    kcal: Math.round(kcal), protein: r1(protein), carb: r1(carb), fat: r1(fat),
    fiber: fiber === null ? null : r1(fiber), servings,
  };
}

const dump = process.argv[2];
if (!dump) {
  console.error("Usage: npm run build:store-foods -- /path/to/en.openfoodfacts.org.products.csv.gz");
  process.exit(1);
}

// Brand tag → [store, how many of its most-scanned to keep].
const wanted = new Map();
for (const [store, brands] of Object.entries(STORES)) for (const [tag, limit] of brands) wanted.set(tag, [store, limit]);

const byBrand = new Map();   // tag → [{ row, scans }]
let cols = null, lines = 0;
const rl = createInterface({ input: createReadStream(dump).pipe(createGunzip()), crlfDelay: Infinity });
try {
for await (const line of rl) {
  if (!cols) { cols = Object.fromEntries(line.split("\t").map((c, i) => [c, i])); continue; }
  if (++lines % 500000 === 0) console.log(`  ${lines.toLocaleString()} rows read`);
  // Cheap pre-filter before splitting a 200-column line.
  if (!line.includes("en:united-states")) continue;
  const f = line.split("\t");
  // Tags come as "great-value" or, on newer rows, "xx:great-value".
  const tags = (f[cols.brands_tags] ?? "").split(",").map((t) => t.replace(/^xx:/, ""));
  const tag = tags.find((t) => wanted.has(t));
  if (!tag) continue;
  if (!(f[cols.countries_tags] ?? "").includes("en:united-states")) continue;
  const list = byBrand.get(tag) ?? [];
  list.push({ f, scans: Number(f[cols.unique_scans_n]) || 0 });
  byBrand.set(tag, list);
}
} catch (e) {
  // A half-downloaded dump ends mid-stream. Only a test run should go on from there.
  if (!process.env.ALLOW_PARTIAL) { console.error(`Could not read the whole dump: ${e.message}`); process.exit(1); }
  console.error(`(partial dump: ${e.message})`);
}

const out = new Map();
for (const [tag, list] of byBrand) {
  const [store, limit] = wanted.get(tag);
  const fallback = tag === "great-value" ? "Great Value" : store;
  list.sort((a, b) => b.scans - a.scans);
  let kept = 0;
  for (const { f } of list) {
    if (kept >= limit) break;
    const get = (k) => f[cols[k]] ?? "";
    const p = {
      code: get("code"), product_name: get("product_name"), brands: get("brands"),
      serving_size: get("serving_size"), serving_quantity: num(get("serving_quantity")),
      quantity: get("quantity"),
      nutriments: {
        "energy-kcal_100g": num(get("energy-kcal_100g")), energy_100g: num(get("energy_100g")),
        proteins_100g: num(get("proteins_100g")), carbohydrates_100g: num(get("carbohydrates_100g")),
        fat_100g: num(get("fat_100g")), fiber_100g: num(get("fiber_100g")),
      },
    };
    const food = toFood(p, store, fallback);
    if (food && !out.has(food.barcode)) { out.set(food.barcode, food); kept++; }
  }
  console.log(`${store} / ${tag}: ${kept} of ${list.length}`);
}

const list = [...out.values()];
writeFileSync(new URL("../db/store-foods.json", import.meta.url), JSON.stringify(list));
const by = (s) => list.filter((f) => f.store === s).length;
console.log(`wrote ${list.length} foods — Aldi ${by("Aldi")}, Walmart ${by("Walmart")}, Schnucks ${by("Schnucks")}; ` +
  `${list.filter((f) => f.servings.length).length} with a pack serving`);
