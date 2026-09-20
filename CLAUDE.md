# FoodLog — notes for Claude

Read `README.md` first; it holds the real explanations. This file is the short
list of things that have already been decided, and traps that look like bugs.

## Do not change without being asked

- **Grams are canonical, and entries carry a macro snapshot.** Editing a food
  must never alter an entry already logged. If a screen ever starts joining
  `entries` to `foods` for its numbers, that is the bug.
- **`fiber_100g` is nullable.** Null means "not known", not zero. Never
  coalesce it to 0 in SQL or in TypeScript. `sumMacros` returns
  `fiberComplete`, and the UI renders `12g+` for an incomplete total.
- **The day string comes from the browser.** Never `current_date`, never
  `new Date()` on the server, in a query or in an action. Vercel is UTC.
- **The four standard meals are virtual** until something is logged into them.
  Do not seed `day_meals` rows on page render.
- **No goals, no targets, no suggestions.** He asked for none: no calorie
  target, no macro goal bars, no "you have X left", no streaks. The history
  bar is relative to his own biggest day, which is why it is not a verdict.

## Traps

- `npm run db:push` is **manual**. Vercel never runs it. Push the schema before
  pushing code that reads a new column — one database serves local and prod.
- The scanner cannot be tested from a `file://` page or over plain http to an
  IP; `getUserMedia` needs a secure context. Use `localhost` or the deployed
  HTTPS URL.
- `db/usda-foods.json` is a large generated data file. **Never read it into
  context** — query it with a script.
- Open Food Facts returns `brands` as a string from the product API and as an
  array from search-a-licious. `lib/off.ts` handles both; do not "simplify" it.
- `@zxing/browser` (camera loop, `decodeFromVideoDevice`) is not `zxing-wasm`
  (`readBarcodes` over ImageData, no camera). The fallback needs the former.

## Env

`DATABASE_URL` (Neon pooled, its **own** Neon project — not IronLogWeb's, not
ClientProgram's) and `APP_PASSCODE`. See `.env.example`.
