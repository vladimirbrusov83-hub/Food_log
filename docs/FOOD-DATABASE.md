# The bundled food list

434 foods ship with the app. They are **curated by hand**, not scraped, and this
page is how to change them.

---

## Why it is curated

The source is USDA FoodData Central **SR Legacy** — 7,793 foods, public domain,
no API key. Filtering it by category and taking what comes out gives you:

```
Oil, ucuhuba butter
Seeds, breadfruit seeds, boiled
Beverages, whiskey sour mix, bottled, with added potassium and sodium
Candies, MARS SNACKFOOD US, MILKY WAY Caramels. dark chocolate covered
```

All food, technically. Useless in a tracker, and they bury the chicken breast.

So `db/food-list.mjs` names the ~434 foods a person actually logs, the way that
person would search for them, and
`scripts/build-usda-foods.mjs` goes and finds each one in the USDA data.

---

## The format

```js
["Chicken breast, raw", ["chicken", "breast", "meat only", "raw"], P],
//  ↑ what you see       ↑ terms that find it in USDA            ↑ category hint
```

| Part | Meaning |
|---|---|
| **Display name** | What appears in the app. Yours to choose. |
| **Terms** | All must appear in the USDA description, case-insensitively. |
| **Category hint** | Optional. A preference, not a filter — used to break ties between two aisles. The short constants (`P`, `M`, `FISH`, …) are defined at the top of the file. |

### Shortest match wins

Among everything matching, the build takes the **shortest USDA description**.
That is not arbitrary: USDA's short entries are the plain ones
(`Broccoli, raw`) and its long ones are the variants nobody wants
(`Beef, chuck, arm pot roast, separable lean only, trimmed to 1/8" fat, choice,
cooked, braised`).

So terms are for *finding*, not for pinning. Add a term to disambiguate, not to
be precise.

### Negation

A term starting with `!` must **not** appear:

```js
["Sour cream", ["cream, sour", "cultured", "!reduced"], D],
```

Without the `!reduced`, shortest-match lands on `Cream, sour, reduced fat,
cultured`. This is the tool for "the real one, not the diet one" — `!light`,
`!fat-free`, `!imitation`, `!toasted`, `!unenriched` all appear in the list.

---

## Adding a food

1. Add a line to the right section of `db/food-list.mjs`.
2. Rebuild (below).
3. Read what it printed. If your food is in the "did not resolve" list, the
   terms don't match anything — see *Finding the right terms*.
4. Check the match is the food you meant, not merely *a* food:
   ```bash
   node -e 'require("./db/usda-foods.json").filter(f=>/chicken/i.test(f.name)).forEach(f=>console.log(f.name,"=>",f.usda))'
   ```
5. `npm run db:push` to put the new rows in the database. Existing rows are left
   alone.

**A food USDA simply does not have** — prosciutto, oat milk, almond flour,
guacamole — should be left out. Scan it or type it once in the app instead;
that is what My Foods is for.

---

## Rebuilding

The USDA file is ~200 MB and is **not** in the repo. Only the small JSON it
produces is.

```bash
curl -LO https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2021-10-28.zip
unzip FoodData_Central_sr_legacy_food_json_2021-10-28.zip
node scripts/build-usda-foods.mjs FoodData_Central_sr_legacy_food_json_2021-10-28.json
```

Output:

```
434 foods written to db/usda-foods.json
```

and, if anything failed, a list of what and with which terms. **Nothing is ever
guessed at** — a food that doesn't resolve is reported and left out.

`db/usda-foods.json` is generated but **checked in**, so a normal clone can run
`db:push` without the 200 MB download.

> **Never read `db/usda-foods.json` into an AI context.** It is a data file.
> Query it with a script, as above.

---

## Finding the right terms

Search the USDA descriptions directly:

```bash
node --max-old-space-size=6000 -e '
const a=require("fs").readFileSync("FoodData_Central_sr_legacy_food_json_2021-10-28.json","utf8");
JSON.parse(a).SRLegacyFoods.map(f=>f.description)
  .filter(d=>/cottage cheese|cheese, cottage/i.test(d)).slice(0,10)
  .forEach(d=>console.log(d));'
```

USDA's word order is often the reverse of yours: it is `Cheese, cottage` not
`cottage cheese`, `Beef, ground` not `ground beef`, `Cream, sour` not `sour
cream`. When terms fail, this is almost always why.

---

## Serving sizes

Servings come from USDA's `foodPortions` — up to three per food, 721 in total.

**SR Legacy usually omits a portion's `amount`.** A 113 g portion of chicken
arrives labelled just `"oz"`, which would put 113 grams behind a chip that reads
like one ounce.

So for real weight units the count is recovered from the grams:
`113 / 28.3495 ≈ 4` → **`4 oz`**. If it doesn't land within 5 % of a whole
number, the portion is dropped rather than shown with a label that lies.

Volume units are left alone. A cup of oil and a cup of flour weigh different
amounts, and that is the whole point of the portion — `cup · 216 g` for olive
oil and `cup · 244 g` for milk are both correct.

Two other exclusions: `"undetermined"` (USDA's placeholder) and anything saying
`yields`, which is a dry-to-cooked conversion rather than a portion.

To audit them after a rebuild:

```bash
node -e '
for (const f of require("./db/usda-foods.json"))
  for (const s of f.servings) {
    const n = parseFloat(s.label);
    if (/^\d+ oz$/.test(s.label) && Math.abs(s.grams - n*28.35)/s.grams > 0.06)
      console.log("suspect:", f.name, s.label, s.grams);
  }'
```

---

## Macros, and the fiber hole

Per 100 g, from these USDA nutrient ids:

| Field | id |
|---|---|
| Energy (kcal) | 1008 |
| Energy (kJ) | 1062 — used as `kcal = kj / 4.184` when 1008 is missing |
| Protein | 1003 |
| Carbohydrate, by difference | 1005 |
| Total lipid (fat) | 1004 |
| Fiber, total dietary | 1079 |

A food missing any of kcal / protein / carb / fat is **reported and skipped**,
not written with a hole in it.

Fiber is different: **9 of the 434 have no fiber figure, and they are stored as
`null`, not `0`.** Null means "USDA did not measure it". The app shows `—` for
those and adds a `+` to any day total containing one. Do not fill them in.

---

## Where the current list came from

Sections, roughly in order: poultry and eggs, beef and lamb, pork and cured
meats, fish and shellfish, dairy, grains and bread, legumes, nuts and oils,
vegetables, fruit, beverages, condiments and spices, sugars, and snacks.

The bias is toward **ingredients over dishes** and **plain over prepared** —
things you weigh, not things you order. Restaurant, fast-food, baby-food and
institutional categories were excluded from the start.
