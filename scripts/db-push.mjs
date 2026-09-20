// Applies db/schema.sql to DATABASE_URL, then seeds the bundled food library.
// Idempotent — safe to re-run.
//   npm run db:push
import { readFileSync } from "node:fs";
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
let seeded = 0;
for (const f of foods) {
  const [row] = await sql`
    INSERT INTO foods (name, kcal_100g, protein_100g, carb_100g, fat_100g, fiber_100g, source)
    VALUES (${f.name}, ${f.kcal}, ${f.protein}, ${f.carb}, ${f.fat}, ${f.fiber}, 'usda')
    ON CONFLICT (lower(name), source) WHERE source = 'usda' DO NOTHING
    RETURNING id`;
  if (!row) continue;
  seeded++;
  for (const [i, s] of f.servings.entries()) {
    await sql`
      INSERT INTO food_servings (food_id, label, grams, position)
      VALUES (${row.id}, ${s.label}, ${s.grams}, ${i})`;
  }
}

const [{ total }] = await sql`SELECT count(*)::int AS total FROM foods`;
console.log(
  `schema applied — ${statements.length} statements, ${total} foods ` +
  `(${seeded} seeded this run)`,
);
