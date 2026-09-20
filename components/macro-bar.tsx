import { fiberLabel, g, kcal, type MacroTotal } from "@/lib/macros";
import type { Macros } from "@/lib/types";

/** The four numbers, in the four colours they keep everywhere in the app. */
export function MacroLine(
  { total, fiberComplete, size = "sm" }:
  { total: MacroTotal; fiberComplete: boolean; size?: "sm" | "lg" },
) {
  const cls = size === "lg" ? "text-sm" : "text-xs";
  return (
    <div className={`tnum flex flex-wrap items-baseline gap-x-3 gap-y-1 ${cls} text-ink-dim`}>
      <span className="text-protein">P {g(total.protein)}g</span>
      <span className="text-carb">C {g(total.carb)}g</span>
      <span className="text-fat">F {g(total.fat)}g</span>
      <span className="text-fiber">Fib {fiberLabel(total.fiber, fiberComplete)}</span>
    </div>
  );
}

/** The proportions of the day, by calories. Decoration with a job: at a glance
 *  it says "mostly carbs today" without him reading a single number. */
export function MacroSplit({ total }: { total: Macros }) {
  const parts = [
    { key: "protein", kcal: total.protein * 4, color: "var(--color-protein)" },
    { key: "carb", kcal: total.carb * 4, color: "var(--color-carb)" },
    { key: "fat", kcal: total.fat * 9, color: "var(--color-fat)" },
  ];
  const sum = parts.reduce((n, p) => n + p.kcal, 0);
  if (sum <= 0) return <div className="h-1.5 rounded-full bg-line" />;
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-line">
      {parts.map((p) => (
        <div key={p.key} style={{ width: `${(p.kcal / sum) * 100}%`, background: p.color }} />
      ))}
    </div>
  );
}

export const kcalText = kcal;
