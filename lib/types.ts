/** Per-100g macros. `fiber` is null when the source didn't say — never 0. */
export type Macros = {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  fiber: number | null;
};

export type Food = Macros & {
  id: number;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: "usda" | "off" | "manual";
  servings: Serving[];
};

export type Serving = { id: number; label: string; grams: number };

/** One logged food. Carries its own macro snapshot; see db/schema.sql. */
export type Entry = Macros & {
  id: number;
  foodId: number | null;
  name: string;
  brand: string | null;
  grams: number;
};

export type Meal = {
  /** null until something is logged into it — the four standards are virtual. */
  id: number | null;
  name: string;
  sortIndex: number;
  entries: Entry[];
};

/** The four every day starts with. "+ Add meal" adds more, for that day only. */
export const STANDARD_MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;
