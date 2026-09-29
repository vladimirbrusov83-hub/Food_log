# FoodLog

A food log for one person, used on a phone.

Meals, servings or grams, 434 everyday foods already in it, and a barcode scanner for
anything that comes in a package. No accounts and no calorie target. The only
targets are optional daily protein, carb and fat lines.

- **Using it** — this page
- **How it is put together** — [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Changing the food list** — [`docs/FOOD-DATABASE.md`](docs/FOOD-DATABASE.md)
- **Putting it online** — [`docs/DEPLOY.md`](docs/DEPLOY.md)
- **Notes for Claude** — [`CLAUDE.md`](CLAUDE.md)

---

## Using it

### The day

The app opens on today. The week strip under the date moves between days (a
dot marks days with food logged); `‹` and `›` jump a week; **Today** comes back.

The summary card shows the day's calories inside a ring. The ring is the split
of those calories between protein (blue), carbs (amber) and fat (coral). It is
not progress toward anything. Beside it, three lines fill toward your daily
protein, carb and fat targets. Set them with **Targets**; leave one blank and
its line just shows grams. There is no calorie target.

Below that, one card per meal: **Breakfast, Lunch, Dinner, Snack**. Tap a
meal's name to fold or unfold it; folded, it still shows its calories and
fat/carbs/protein. Each food inside shows its own fat, carbs and protein. Tap
the green **+** to add food to that meal.

Fat, carbs, protein are always in that order, on every screen.

### Adding food

The add screen has a search box, **Scan barcode**, **Create food**, and two
lists:

- **Recent**: the foods you log most, each with the amount you had last time.
  Tap the row to choose an amount, or tap **+** to log last time's amount
  straight away. A bar at the bottom confirms it, with **Undo**.
- **My foods**: everything you created or scanned.

*Not loaded yet (see `npm run build:store-foods`):* the tabs **Aldi**, **Walmart**
and **Schnucks** will list those stores' own brands
(Friendly Farms, Great Value, Schnucks and the rest), most popular first, each
with the serving size printed on the pack. With a store tab picked, the search
box searches only that store.

Search looks in your foods, the store products and the 434 bundled basics
(**Library**), then Open Food Facts (**Packaged foods**). Every word has to
match, so "aldi greek" works. If nothing fits, **Create "…" yourself** is under
the results.

### Portions: servings or grams

Every food can be logged in **grams**. Foods with a serving size also have
**Servings**: pick the serving (for example "1 slice · 20 g") and how many,
with − / + or ½ 1 1½ 2 3. Switching between the two keeps the amount.

There are no cups, spoons or ounces anywhere. The bundled foods' volume and
imperial measures are hidden, so many plain foods (rice, oats) are grams only.

The next time you open a food, it starts on the amount you used last time.

### Creating a food

**Create food** asks for a name, optionally a brand, and **serving sizes** such
as "1 bar = 60 g". You can add several. Then the nutrition, **per 100 g** or
**per serving**. American labels are per serving, so pick that and copy the
label as printed. Switching between the two converts what you already typed.
It is stored per 100 g either way.

### Scanning a barcode

Tap **Scan barcode**, then **Start camera**, and point it at the barcode:

- **Found**: straight to the portion screen. The product is saved into My foods,
  so next time the scan doesn't look anything up.
- **Not found**: the same form as Create food, with the barcode attached.
  Copy the label once and that barcode is yours from then on.

Open Food Facts is patchy on American shelves, so "not found" is normal. There
is also a box to type the number when a barcode is scuffed.

**The camera only works over https.** On your phone that means the deployed
site.

### Extra meals

**Add a meal** at the bottom adds a meal to *that day only*. An empty one you
added by mistake has a **Remove**.

### Changing or deleting an entry

Tap the food inside a meal. It opens the same servings/grams screen. Change it
and **Save**, or **Remove from …**.

### My foods

The **My foods** tab lists everything you created or scanned, not the 434
bundled ones. Tap one to change its numbers or serving sizes, or delete it.

**Editing a food never changes anything you already logged.** Every entry keeps
its own copy of the macros from the moment you saved it.

### History

Days you logged, newest first, each with calories, its protein/carb/fat split
and grams. The card on top averages your last seven logged days.

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
