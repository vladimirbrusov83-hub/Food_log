import { fiberLabel, g, kcal, type MacroTotal } from "@/lib/macros";
import type { Macros } from "@/lib/types";
import type { Targets } from "@/lib/db";
import Link from "next/link";

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

/** Protein, carbs and fat as lines that fill toward his daily targets. A macro
 *  with no target set shows its grams over an empty track. Past the target the
 *  line stays full; the number says by how much. */
export function MacroTargets(
  { total, targets, fiberComplete, day }:
  { total: MacroTotal; targets: Targets; fiberComplete: boolean; day: string },
) {
  const rows = [
    { key: "protein", label: "Protein", value: total.protein, target: targets.protein, color: "var(--color-protein)" },
    { key: "carb", label: "Carbs", value: total.carb, target: targets.carb, color: "var(--color-carb)" },
    { key: "fat", label: "Fat", value: total.fat, target: targets.fat, color: "var(--color-fat)" },
  ];
  const anyTarget = rows.some((r) => r.target);
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const pct = r.target ? Math.min(1, r.value / r.target) : 0;
        return (
          <div key={r.key} className="grid grid-cols-[3.75rem_1fr_auto] items-center gap-2.5">
            <span className="text-xs font-semibold" style={{ color: r.color }}>{r.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              {pct > 0 && (
                <div
                  className="fill-in h-full rounded-full"
                  style={{ width: `${pct * 100}%`, background: r.color }}
                />
              )}
            </div>
            <span className="tnum min-w-[4.75rem] text-right text-xs text-ink-dim">
              <span className="font-semibold text-ink">{g(r.value)}</span>
              {r.target ? ` / ${g(r.target)}g` : "g"}
            </span>
          </div>
        );
      })}
      <div className="flex items-center justify-between text-xs">
        <span className="tnum text-fiber">Fib {fiberLabel(total.fiber, fiberComplete)}</span>
        <Link href={`/targets?d=${day}`} className="-my-3 flex min-h-11 items-center px-1 text-ink-dim">
          {anyTarget ? "Targets ›" : "Set targets ›"}
        </Link>
      </div>
    </div>
  );
}

export const kcalText = kcal;
