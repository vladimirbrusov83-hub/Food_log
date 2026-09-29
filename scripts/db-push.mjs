// Applies db/schema.sql to DATABASE_URL, then seeds the bundled food library.
// Idempotent — safe to re-run.
//   npm run db:push
import { existsSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in .env.local and try again.");
  process.exit(1);
}

const sql = neon(url);
const file = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

// The HTTP driver sends one statement per request, so the file is split rather
// than sent whole. Line comments go first so a "--" line can't hide a semicolon.
const statements = file
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

for (const statement of statements) {
  try {
    await sql.query(statement);
  } catch (err) {
    console.error(`\nFailed on:\n${statement}\n`);
    throw err;
  }
}

const foods = JSON.parse(readFileSync(new URL("../db/usda-foods.json", import.meta.url), "utf8"));

// foods_seed_key is (lower(name), source) for source = 'usda', so re-running
// adds nothing and overwrites nothing. A food he edited by hand stays edited.
//
// Sent as two array statements rather than a row at a time: the Neon HTTP
// driver is one request per statement, and 434 foods with their servings is
// ~1600 round trips — minutes of apparent silence on a first run.
const seededRows = await sql`
  INSERT INTO foods (name, kcal_100g, protein_100g, carb_100g, fat_100g, fiber_100g, source)
  SELECT * FROM unnest(
    ${foods.map((f) => f.name)}::text[],
    ${foods.map((f) => f.kcal)}::real[],
    ${foods.map((f) => f.protein)}::real[],
    ${foods.map((f) => f.carb)}::real[],
    ${foods.map((f) => f.fat)}::real[],
    ${foods.map((f) => f.fiber)}::real[]
  ) AS t(name, kcal, protein, carb, fat, fiber), (SELECT 'usda') AS s(source)
  ON CONFLICT (lower(name), source) WHERE source = 'usda' DO NOTHING
  RETURNING id, name`;

// Servings belong only to the rows this run actually inserted. A re-run
// inserts nothing above, so it adds no duplicate servings here either.
const byName = new Map(seededRows.map((r) => [r.name, Number(r.id)]));
const servings = [];
for (const f of foods) {
  const id = byName.get(f.name);
  if (id === undefined) continue;
  f.servings.forEach((s, i) => servings.push([id, s.label, s.grams, i]));
}
if (servings.length) {
  await sql`
    INSERT INTO food_servings (food_id, label, grams, position)
    SELECT * FROM unnest(
      ${servings.map((s) => s[0])}::bigint[],
      ${servings.map((s) => s[1])}::text[],
      ${servings.map((s) => s[2])}::real[],
      ${servings.map((s) => s[3])}::int[]
    )`;
}
const seeded = seededRows.length;

// Store-brand products (Aldi, Walmart, Schnucks), from scripts/build-store-foods.mjs.
// Keyed on barcode: a product he already scanned keeps his row, and a re-run
// inserts nothing twice.
const storeFile = new URL("../db/store-foods.json", import.meta.url);
let storeSeeded = 0;
if (existsSync(storeFile)) {
  const store = JSON.parse(readFileSync(storeFile, "utf8"));
  for (let i = 0; i < store.length; i += 1000) {
    const chunk = store.slice(i, i + 1000);
    const rows = await sql`
      INSERT INTO foods (name, brand, barcode, store, kcal_100g, protein_100g, carb_100g, fat_100g, fiber_100g, source)
      SELECT t.*, 'store' FROM unnest(
        ${chunk.map((f) => f.name)}::text[], ${chunk.map((f) => f.brand)}::text[],
        ${chunk.map((f) => f.barcode)}::text[], ${chunk.map((f) => f.store)}::text[],
        ${chunk.map((f) => f.kcal)}::real[], ${chunk.map((f) => f.protein)}::real[],
        ${chunk.map((f) => f.carb)}::real[], ${chunk.map((f) => f.fat)}::real[],
        ${chunk.map((f) => f.fiber)}::real[]
      ) AS t(name, brand, barcode, store, kcal, protein, carb, fat, fiber)
      ON CONFLICT (barcode) WHERE barcode IS NOT NULL DO NOTHING
      RETURNING id, barcode`;
    const byCode = new Map(rows.map((r) => [r.barcode, Number(r.id)]));
    const sv = [];
    for (const f of chunk) {
      const id = byCode.get(f.barcode);
      if (id !== undefined) f.servings.forEach((s, j) => sv.push([id, s.label, s.grams, j]));
    }
    if (sv.length) {
      await sql`
        INSERT INTO food_servings (food_id, label, grams, position)
        SELECT * FROM unnest(${sv.map((s) => s[0])}::bigint[], ${sv.map((s) => s[1])}::text[],
                             ${sv.map((s) => s[2])}::real[], ${sv.map((s) => s[3])}::int[])`;
    }
    storeSeeded += rows.length;
  }
}
console.log(`store products: ${storeSeeded} seeded this run`);

const [{ total }] = await sql`SELECT count(*)::int AS total FROM foods`;
console.log(
  `schema applied — ${statements.length} statements, ${total} foods ` +
  `(${seeded} seeded this run)`,
);
