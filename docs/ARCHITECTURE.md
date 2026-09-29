# How FoodLog is put together

For anyone — human or Claude — about to change something. Four decisions here
are load-bearing; the rest is ordinary Next.js.

---

## The four rules

### 1. Grams are canonical, and every entry carries a snapshot

An entry does not point at a food and read its macros. It stores **grams** plus
**a copy of that food's per-100 g numbers at the moment it was logged**:

```sql
entries (…, grams, kcal_100g, protein_100g, carb_100g, fat_100g, fiber_100g)
```

So editing a food later cannot rewrite history. `app/foods/[foodId]` says this
on screen, and it is the behaviour to protect.

**If a screen ever starts joining `entries` to `foods` to get its numbers, that
is the bug.** `food_id` is kept only for "recent foods" and is `ON DELETE SET
NULL` — deleting a food must not delete what you ate.

Serving presets ("1 cup = 244 g") are a convenience on top of grams. They fill
in the grams field and nothing downstream knows they exist. Resist adding a
second unit; portion math is the part of a food tracker that actually goes
wrong.

All of it lives in one place, `lib/macros.ts`: `grams × per100g / 100`, rounded
once at display so a total is never a sum of already-rounded parts.

### 2. `fiber_100g` is nullable, and null means "not known"

Open Food Facts frequently has no fiber figure. Writing `0` would invent fiber
nobody ate, and it would be invisible.

`sumMacros` returns `fiberComplete` alongside the total. A day containing one
unknown renders **`12g+`** rather than a confident wrong number, and the portion
screen shows **`—`** with a line saying so.

**Never coalesce it to zero**, in SQL or TypeScript. This is the same class of
bug as the Postgres `least()` NULL trap that once made unrated sets score full
marks in IronLogWeb.

### 3. The day comes from the phone, never the server

Vercel runs in UTC. A server-side `current_date` files an 8 pm Central dinner
under tomorrow — and you would only notice in the evening, which is exactly when
nobody is testing.

So: the URL carries `?d=YYYY-MM-DD`. `components/today-redirect.tsx` puts it
there once from `new Date()`, and every action takes the day as a string
parameter.

`components/day-header.tsx` is a **client** component for this reason. It works
out "today" in the browser rather than taking it from a search param — an
earlier version threaded `today` through the URL, and one redirect that forgot
it made yesterday call itself Today for the rest of the session.

**Never `current_date`, never `new Date()` on the server**, in a query or an
action. `lib/day.ts` has the helpers; `toDayString` is local-time on purpose
(`toISOString` would be UTC and would reintroduce the bug).

Verified across three timezones: with the server on Sep 20 UTC, an Auckland
phone correctly showed Sep 21.

### 4. The four standard meals are virtual

Breakfast / Lunch / Dinner / Snack are drawn from `STANDARD_MEALS` in
`lib/types.ts` whether or not a database row exists. The row is created by
`findOrCreateMeal` the first time something is logged into it.

So nothing is written while a page renders, and swiping through a month of empty
days leaves no rows behind. **Do not seed `day_meals` on page load.**

`+ Add meal` is the one place that inserts a `day_meals` row directly, and it
adds a meal to *that day only* — there is no global meal list to maintain.

---

## And one product rule

**Macro targets, and nothing more.** At first there were no targets at all. On
2026-09-29 he asked for protein/carb/fat lines that fill toward daily targets he
sets (`/targets`, one-row `targets` table, blank = no target). There is still no
calorie target, no "you have 400 left", no streaks, no suggestions, and no
weekly averages presented as a grade (History shows a plain 7-day average). The ring
on the day screen is the calorie *split*, not progress.

**Servings or grams, nothing else.** `lib/servings.ts` hides volume and imperial
measures (cup, tbsp, tsp, oz, lb, package) and tidies the rest ("1 slice").
Entries store grams as always, plus `serving_label`/`serving_qty` as a snapshot
for display and for re-opening the entry.

---

## The data model

```
foods            the library — 434 seeded USDA rows, plus anything scanned
                 or typed. name, brand, barcode, per-100g macros, source.

food_servings    "1 cup = 244 g". Zero or more per food; ordered.

day_meals        (day, name) unique. Only exists once a meal has something in
                 it, or was added by hand.

entries          one logged food: grams + a macro snapshot. Belongs to a
                 day_meal; points at a food only for the recents list.
```

Three indexes carry weight:

- `foods_barcode_key` — partial unique on `barcode WHERE barcode IS NOT NULL`,
  so one product is one row and a rescan resolves locally.
- `foods_seed_key` — partial unique on `(lower(name), source) WHERE source =
  'usda'`, which is what makes `db:push` idempotent without touching foods you
  edited by hand.
- `day_meals (day, name)` unique — what `findOrCreateMeal` upserts against.

---

## Where things are

| Path | What it does |
|---|---|
| `app/page.tsx` | The day. Week strip, summary card, meal cards. |
| `app/entry/[entryId]/page.tsx` | Change or remove one logged entry. |
| `app/targets/page.tsx` | Daily protein/carb/fat targets. |
| `app/actions.ts` | Every write. Server actions; each takes `day` as a string. |
| `app/add/page.tsx` | Search, Scan, Create, Recent (with quick +) and My foods. |
| `app/add/[foodId]/page.tsx` | The portion step (`components/portion-form.tsx`). |
| `app/scan/page.tsx` | Wrapper around the scanner. |
| `app/foods/**` | My foods: list, new, edit. |
| `app/history/page.tsx` | Days logged, newest first. |
| `app/login/page.tsx` | The passcode form. |
| `lib/db.ts` | Every query. Raw SQL, no ORM. |
| `lib/macros.ts` | Portion arithmetic and the fiber-total rule. |
| `lib/servings.ts` | Which serving sizes are shown, and how a portion reads. |
| `scripts/build-store-foods.mjs` | Builds `db/store-foods.json` (Aldi/Walmart/Schnucks) from OFF. |
| `components/meal-card.tsx` | One collapsible meal on the day screen. |
| `components/food-form.tsx` | Create/edit food and the scanner's not-found form. |
| `lib/day.ts` | Local-time date helpers. |
| `lib/off.ts` | Open Food Facts client. |
| `lib/auth.ts`, `middleware.ts` | The passcode gate (copied from IronLogWeb). |
| `components/scanner.tsx` | Camera, two decoders, the not-found form. |
| `db/schema.sql` | Tables and indexes. |
| `db/food-list.mjs` | The curated food list — see `FOOD-DATABASE.md`. |
| `scripts/db-push.mjs` | Applies the schema, seeds the foods. Idempotent. |

---

## The gate

One passcode, no accounts, copied verbatim from IronLogWeb.

The cookie does not hold the passcode. It holds an HMAC of a fixed string keyed
by it, so the cookie is useless elsewhere and changing `APP_PASSCODE` signs out
every browser that was open. Web Crypto only, because middleware runs on the
edge. Comparisons are constant-time, and both sides are hashed first so the real
passcode's length never shows through.

`middleware.ts` covers every route but `/login` and Next's own assets. Nothing
here is public.

---

## The scanner

Two decoders, because one is not everywhere:

- **`window.BarcodeDetector`** — native, present in Chrome on Android. Used when
  it exists. Its detect loop is throttled to 150 ms; every animation frame would
  be 60 detections a second and would cook the phone.
- **`@zxing/browser`** — lazy-loaded when the native one is missing, which is
  the case in Safari. Uses `decodeFromConstraints` with
  `facingMode: { ideal: "environment" }`. Passing `undefined` to
  `decodeFromVideoDevice` instead takes whatever camera the library picks first,
  which on a phone is usually the selfie one.

**It is `@zxing/browser`, not `zxing-wasm`.** Different packages: the latter
exposes `readBarcodes` over ImageData and has no camera loop at all.

`getUserMedia` requires a secure context, so **the scanner cannot be tested from
a `file://` page or over plain http to an IP address.** `localhost` or the
deployed https URL, and nothing else. The error message on screen says which of
the three likely causes it was.

Formats are limited to EAN-13 / EAN-8 / UPC-A / UPC-E — grocery barcodes, not
QR codes.

### What happens on a read

1. Check `foods.barcode` first. A product scanned before never leaves the
   server.
2. Otherwise ask Open Food Facts.
3. **Found** → save it into the library with its barcode, go to the portion
   step.
4. **Not found** → the manual form, which keeps the barcode. This path is a
   feature, not an error state, and it is deliberately as fast as the happy one.

---

## Open Food Facts

Free, public, no API key — which is why the lookup runs on the server: nothing
about it needs to be in the browser, and OFF asks for an identifying
`User-Agent`.

| Use | Endpoint |
|---|---|
| Barcode | `world.openfoodfacts.org/api/v2/product/<code>.json` |
| Text search | `search.openfoodfacts.org/search` (search-a-licious) |

**The old `cgi/search.pl` returns 503.** It is not used. Do not reach for it.

Two shapes to know:

- `brands` comes back as a **string** (`"A,B"`) from the product API and as an
  **array** (`["A","B"]`) from search-a-licious. `lib/off.ts` handles both. Do
  not "simplify" that.
- Some products carry only kilojoules. `kcal = kj / 4.184` when
  `energy-kcal_100g` is missing; a product with neither is refused rather than
  logged as silently 0 kcal.

Coverage of US packaged goods is patchy. Treat a miss as ordinary.

---

## Deploying and the database

`npm run db:push` is **manual and must run before pushing code that reads a new
column.** One Neon database serves local and production, and Vercel never runs
it. Push the schema first, the code second.

It seeds by sending the 434 foods and their 721 servings as two `unnest` array
statements. Row-at-a-time would be ~1600 HTTP round trips through the Neon
driver — minutes of apparent silence on a first run.

FoodLog has **its own Neon project**, separate from IronLogWeb's and
ClientProgram's.

---

## What has been verified, and what has not

Tested end-to-end in Playwright at 375 px against the live database:

- Seed, then re-seed — 434 in, second run adds 0
- Portion arithmetic (150 g of a 120 kcal/100 g food → 180 kcal)
- Editing an entry's grams, and the day total following
- A meal added to one day appearing on that day only
- A food edited to 999 kcal/100 g leaving an existing entry untouched
- A real barcode through to the right product
- An unknown barcode through the manual form and into the log
- Blank fiber rendering as `—` and as `0g+` in the day total
- The day boundary following the phone's timezone, not the server's
- No horizontal scroll and no tap target under 44 px

**Not verified:** the camera itself. Typing barcodes by hand proves the lookup
half; the decode half needs a real phone on https. That is the first thing to
check after deploying.
