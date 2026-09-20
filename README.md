# FoodLog

A food log for one person, used on a phone.

Collapsible meals, 434 everyday foods already in it, and a barcode scanner for
anything that comes in a package. No accounts, no calorie target, nothing that
tells you how you did.

- **Using it** — this page
- **How it is put together** — [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Changing the food list** — [`docs/FOOD-DATABASE.md`](docs/FOOD-DATABASE.md)
- **Putting it online** — [`docs/DEPLOY.md`](docs/DEPLOY.md)
- **Notes for Claude** — [`CLAUDE.md`](CLAUDE.md)

---

## Using it

### The day

The app opens on today. `‹` and `›` move a day at a time; tapping the date in
the middle jumps back to today.

Under the date is the day's total: calories, then protein, carbs, fat and
fiber. The thin bar above them is the split of those calories — blue protein,
yellow carbs, orange fat — so you can see "mostly carbs today" without reading
a number.

Below that, one card per meal: **Breakfast, Lunch, Dinner, Snack**. A card
collapsed still shows its calories and macros. Tap it to open.

### Adding food

Tap **+ Add food** inside a meal. The screen opens on **Recent** — the foods
you log most, most-used first. After a week or two this is the whole app, and
adding breakfast is two taps.

Below that is a search box. It looks in two places and labels them:

- **Library** — the 434 foods that ship with the app. Plain things: chicken
  breast, oats, olive oil, bananas. Instant, works without a signal.
- **Open Food Facts** — a free public database of packaged products. Slower,
  and it doesn't have everything.

Pick one and you land on the portion screen.

### Portions

Everything is stored in **grams**. Type a number, or tap a chip.

The chips above the number pad are that food's known servings — `4 oz · 113 g`,
`cup · 244 g`, `slice · 28 g`. They just fill in the grams for you; there is no
second unit hiding anywhere. Under them, five quick amounts: 25, 50, 100, 150,
200.

The calories and macros update as you type. Then **Add to Breakfast**.

### Scanning a barcode

Tap **Scan** at the top right of the add screen, then **Start camera**. Point it
at the barcode. It reads it and looks it up:

- **Found** → straight to the portion screen, and the product is saved into your
  own library. Next time you scan it, it doesn't go looking at all.
- **Not found** → a short form. Copy the numbers from the label — *the per-100 g
  column, not the per-serving one* — and hit Save. That barcode is yours from
  then on.

Open Food Facts is patchy on American shelves, so "not found" is normal, not a
failure. There is also a **type the number** box under the camera for when a
barcode is scuffed or the light is bad.

**The camera only works over https.** On your phone that means the deployed
site. It will not work from a file on your computer.

### Extra meals

**+ Add meal** at the bottom adds a meal to *that day only* — Pre-workout,
Second dinner, whatever. It does not change any other day. There are shortcut
chips for the common ones.

An empty meal you added by mistake has a **Remove** next to its Add food link.
Once there is food in it, Remove disappears — delete the entries first.

### Changing or deleting an entry

Tap the food inside a meal. A grams box and a **Remove** appear. Change the
number and **Save**, or Remove it.

### My foods

The **Foods** tab is everything you scanned or typed in yourself — not the 434
bundled ones, which would just be a catalogue to scroll. Tap one to fix its
numbers or delete it.

**Editing a food never changes anything you already logged.** Every entry keeps
its own copy of the macros from the moment you saved it. If Chobani changes its
recipe and you update the food, last Tuesday stays last Tuesday.

### History

Days you logged, newest first, with the calories. The bar next to each is scaled
to your own biggest day — it is not a target, and it is not a verdict.

---

## Running it on your computer

You need the Neon connection string and a passcode.

```bash
cp .env.example .env.local     # then fill in the two values
npm install
npm run db:push                # creates the tables, loads the 434 foods
npm run dev                    # http://localhost:3000
```

`db:push` is safe to run as many times as you like — the second run adds
nothing and overwrites nothing.

To see the phone layout on a laptop: in Chrome press ⌥⌘I, then click the little
phone icon and pick an iPhone.

### The two settings

| Name | What it is |
|---|---|
| `DATABASE_URL` | Your Neon **pooled** connection string — the one with `-pooler` in the hostname. |
| `APP_PASSCODE` | The passcode that opens the app. Change it and every browser is signed out. |

They live in `.env.local`, which is never committed. The repo is public; keep
them out of it.

---

## Troubleshooting

**"DATABASE_URL is not set"** — `.env.local` is missing or empty. Copy
`.env.example` over it and fill in both values.

**The app asks for a passcode and won't take it** — `APP_PASSCODE` isn't set, or
you changed it. Changing it signs out every browser on purpose.

**The scanner says the camera won't start** — it needs https. Use the deployed
site on your phone, or `localhost` on your computer. A phone pointed at
`http://192.168.x.x` will not work.

**The scanner finds nothing on an American product** — normal. Use the manual
form; it takes about twenty seconds and you only ever do it once per product.

**A day's numbers look shifted by one day** — they shouldn't be; the app takes
the date from your phone, not the server. If you ever see it, say so, because
it means something real broke.

**`npm run dev` throws `ENOENT ... _buildManifest.js.tmp`** — something deleted
`.next` while the server was running. Stop it, `rm -rf .next`, start it again.

---

## The shape of it

Next.js 15 (App Router), React 19, Tailwind 4, and Neon Postgres over
`@neondatabase/serverless` with plain SQL and no ORM. Deployed on Vercel. The
same stack as IronLogWeb and ClientProgram, on purpose — three apps that work
the same way are easier to keep than three that don't.

One passcode, no accounts, because one person uses it and the URL is public.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the pieces fit and
which decisions are load-bearing.
