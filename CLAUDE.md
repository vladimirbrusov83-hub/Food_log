# FoodLog — notes for Claude

`README.md` is how the app is used. `docs/ARCHITECTURE.md` is how it works and
*why* — read it before changing anything structural. This file is the short list
of things already decided and traps that look like bugs.

## Do not change without being asked

- **Grams are canonical, and entries carry a macro snapshot.** Editing a food
  must never alter an entry already logged. If a screen starts joining `entries`
  to `foods` for its numbers, that is the bug.
- **`fiber_100g` is nullable.** Null means "not known", not zero. Never coalesce
  it to 0 in SQL or TypeScript. `sumMacros` returns `fiberComplete`, and the UI
  renders `12g+` for an incomplete total.
- **The day string comes from the browser.** Never `current_date`, never
  `new Date()` on the server, in a query or an action. Vercel is UTC. The date
  header is a client component for exactly this reason.
- **The four standard meals are virtual** until something is logged into them.
  Do not seed `day_meals` rows on page render.
- **Macro targets, and nothing more.** Originally he wanted no targets at all;
  on 2026-09-29 he asked for protein/carb/fat lines that fill toward daily
  targets he sets (`/targets`, one-row `targets` table, blank = no target).
  Still no calorie target, no "you have X left", no streaks, no suggestions.
  The history bar is relative to his own biggest day, not a target.

## Traps

- `npm run db:push` is **manual**. Vercel never runs it. Push the schema before
  pushing code that reads a new column — one database serves local and prod.
- The scanner cannot be tested from a `file://` page or over plain http to an
  IP; `getUserMedia` needs a secure context. Use `localhost` or the deployed
  https URL.
- `db/usda-foods.json` is a large generated data file. **Never read it into
  context** — query it with a script. `docs/FOOD-DATABASE.md` has the one-liners.
- Open Food Facts returns `brands` as a string from the product API and as an
  array from search-a-licious. `lib/off.ts` handles both; do not "simplify" it.
  Its old `cgi/search.pl` endpoint returns 503 — do not reach for it.
- `@zxing/browser` (camera loop, `decodeFromConstraints`) is not `zxing-wasm`
  (`readBarcodes` over ImageData, no camera). The fallback needs the former.
- Running `next build` while `npm run dev` is up deletes `.next` underneath it
  and the dev server then 500s on every request. Stop it, `rm -rf .next`,
  restart.

## Verified, and not

`docs/ARCHITECTURE.md` ends with the full list. The short version: everything
but the camera has been exercised end-to-end in Playwright at 375 px against the
live database. **The decode half of the scanner has never run against a real
camera** — typing a barcode by hand proves only the lookup. Do not describe it
as working until it has been tried on a phone over https.

## Env

`DATABASE_URL` (Neon pooled, its **own** Neon project — not IronLogWeb's, not
ClientProgram's) and `APP_PASSCODE`. See `.env.example` and `docs/DEPLOY.md`.
The GitHub repo is private, but nothing with a secret in it goes in a tracked
file.
