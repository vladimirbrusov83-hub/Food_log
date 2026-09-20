# FoodLog

A food log for one person, used on a phone. Collapsible meals, a bundled
library of 434 everyday foods, and a barcode scanner for everything on a
package.

No accounts. One passcode, because the URL is public.

## Run it

```bash
cp .env.example .env.local     # fill in DATABASE_URL and APP_PASSCODE
npm install
npm run db:push                # schema + the 434 seeded foods, idempotent
npm run dev                    # http://localhost:3000
```

**`npm run db:push` is a manual step before pushing code that reads a new
column.** One Neon database serves local and production, and Vercel never runs
it.

## The parts worth knowing before editing

**Grams are canonical.** Every entry is stored as grams plus a *snapshot* of
the food's macros per 100 g at the moment it was logged. Editing a food later
never rewrites history — `app/foods/[foodId]` says so on screen, and the
snapshot columns in `db/schema.sql` are what make it true. Serving presets
("1 cup = 240 g") only fill in the grams field; nothing downstream knows about
them.

**Fiber is nullable, and that is deliberate.** Open Food Facts frequently has
no fiber figure, and writing 0 would invent fiber nobody ate. `sumMacros` in
`lib/macros.ts` tracks `fiberComplete` alongside the total, and a day with an
unknown in it renders `12g+` rather than a false exact number. Do not "fix" the
nulls to zero.

**The day comes from the phone, never the server.** Vercel runs UTC, so a
server-side `current_date` would file an 8 pm dinner under tomorrow. The URL
carries `?d=YYYY-MM-DD`, `components/today-redirect.tsx` puts it there once
from `new Date()`, and every action takes the day as a string.

**The four standard meals are virtual.** Breakfast / Lunch / Dinner / Snack are
drawn from a constant in `lib/types.ts` whether or not a row exists. The row is
created by `findOrCreateMeal` when something is first logged into it, so
swiping through empty days writes nothing. "+ Add meal" adds a meal to *that
day only* — there is no global meal list.

**The scanner needs a secure context.** `getUserMedia` does not run from a
`file://` page. Test on `localhost` or on the deployed HTTPS URL. Chrome on
Android has a native `BarcodeDetector`; Safari does not, so the page
lazy-loads `@zxing/browser` only on the phones that need it.

## The bundled food library

`db/usda-foods.json` is generated, checked in, and **never read into an AI
context** — it is a data file. It comes from USDA FoodData Central SR Legacy
(public domain, no API key), via:

```bash
curl -LO https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2021-10-28.zip
unzip FoodData_Central_sr_legacy_food_json_2021-10-28.zip
node scripts/build-usda-foods.mjs path/to/FoodData_Central_sr_legacy_food_json_2021-10-28.json
```

The foods themselves are curated by hand in `db/food-list.mjs`. Auto-selecting
by USDA category gives you ucuhuba butter and boiled breadfruit seeds — food,
technically, useless in a tracker. Each row names the food the way you would
search for it plus the terms that find it; a term starting with `!` must *not*
appear, which is how "sour cream, cultured" avoids matching the imitation one.
Anything that fails to resolve is printed by the build and left out rather than
guessed at.

## Open Food Facts

Barcode lookups go to `world.openfoodfacts.org/api/v2/product/<code>.json`;
text search goes to `search.openfoodfacts.org/search`. The old `cgi/search.pl`
returns 503 and is not used. Coverage of US packaged goods is patchy, so "not
found" is an ordinary outcome with its own form: type the per-100 g numbers
once, and that barcode resolves from your own library forever after.

## Stack

Next.js 15 App Router, React 19, Tailwind 4, Neon Postgres over
`@neondatabase/serverless` with raw SQL and no ORM. Same shape as IronLogWeb
and ClientProgram on purpose.
