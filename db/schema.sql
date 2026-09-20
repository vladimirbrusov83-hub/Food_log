-- FoodLog schema. Applied by `npm run db:push`, which is idempotent.
-- One person, one database. No user table anywhere.

CREATE TABLE IF NOT EXISTS foods (
  id            bigserial PRIMARY KEY,
  name          text NOT NULL,
  brand         text,
  barcode       text,
  -- Per 100 g. Grams are the canonical unit everywhere in this app.
  kcal_100g     real NOT NULL,
  protein_100g  real NOT NULL,
  carb_100g     real NOT NULL,
  fat_100g      real NOT NULL,
  -- Nullable on purpose: Open Food Facts often has no fiber, and 0 is a lie.
  -- A total that includes an unknown renders "12g+", never a false exact number.
  fiber_100g    real,
  source        text NOT NULL DEFAULT 'manual',  -- 'usda' | 'off' | 'manual'
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- One product, one row. Scanning a barcode already in the library never calls out.
CREATE UNIQUE INDEX IF NOT EXISTS foods_barcode_key
  ON foods (barcode) WHERE barcode IS NOT NULL;
-- Re-running the USDA seed must not duplicate its own rows.
CREATE UNIQUE INDEX IF NOT EXISTS foods_seed_key
  ON foods (lower(name), source) WHERE source = 'usda';
CREATE INDEX IF NOT EXISTS foods_name_idx ON foods (lower(name));

-- "1 slice = 28 g". Sugar on top of grams; a food with none is still complete.
CREATE TABLE IF NOT EXISTS food_servings (
  id       bigserial PRIMARY KEY,
  food_id  bigint NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  label    text NOT NULL,
  grams    real NOT NULL,
  position int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS food_servings_food_idx ON food_servings (food_id);

-- Meals exist per day. The four standard ones are VIRTUAL — the day view draws
-- them from a constant whether or not a row exists, and the add-entry action
-- find-or-creates the row. Nothing is written while a page renders, so swiping
-- through empty dates leaves nothing behind. "+ Add meal" is the only place
-- that inserts one directly.
CREATE TABLE IF NOT EXISTS day_meals (
  id         bigserial PRIMARY KEY,
  -- A plain date, always sent by the phone as its own local YYYY-MM-DD.
  -- Vercel runs UTC: a server-side current_date files an 8pm dinner tomorrow.
  day        date NOT NULL,
  name       text NOT NULL,
  sort_index int NOT NULL DEFAULT 0,
  UNIQUE (day, name)
);
CREATE INDEX IF NOT EXISTS day_meals_day_idx ON day_meals (day);

CREATE TABLE IF NOT EXISTS entries (
  id           bigserial PRIMARY KEY,
  day_meal_id  bigint NOT NULL REFERENCES day_meals(id) ON DELETE CASCADE,
  -- Kept for "recent foods" and for re-opening the portion sheet. Nulled, not
  -- cascaded, if the food is ever deleted: the entry's own numbers still stand.
  food_id      bigint REFERENCES foods(id) ON DELETE SET NULL,
  name         text NOT NULL,
  brand        text,
  grams        real NOT NULL,
  -- Snapshot of the food at the moment it was logged. Editing a food later
  -- must never rewrite history.
  kcal_100g    real NOT NULL,
  protein_100g real NOT NULL,
  carb_100g    real NOT NULL,
  fat_100g     real NOT NULL,
  fiber_100g   real,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entries_meal_idx ON entries (day_meal_id);
CREATE INDEX IF NOT EXISTS entries_food_idx ON entries (food_id);
CREATE INDEX IF NOT EXISTS entries_recent_idx ON entries (created_at DESC);
