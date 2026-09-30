import Link from "next/link";
import { fiberLabel, g, kcal, type MacroTotal } from "@/lib/macros";
import type { Macros } from "@/lib/types";
import type { Targets } from "@/lib/db";
import { Icon } from "./ui";

export const MACROS = [
  // `ink` is the same hue dark enough to read as text on white.
  // Fat, carbs, protein: the order he reads them in, everywhere in the app.
  { key: "fat", label: "Fat", short: "Fat", color: "var(--color-fat)", ink: "oklch(0.55 0.16 35)", kcalPerG: 9 },
  { key: "carb", label: "Carbs", short: "Carb", color: "var(--color-carb)", ink: "oklch(0.58 0.13 70)", kcalPerG: 4 },
  { key: "protein", label: "Protein", short: "Protein", color: "var(--color-protein)", ink: "oklch(0.5 0.15 255)", kcalPerG: 4 },
] as const;

/**
 * Where the calories came from, as a ring: protein, carbs and fat by their
 * share of the energy. It is a split, not progress — there is no calorie
 * target in this app. Empty day, empty grey ring.
 */
export function MacroDonut(
  { total, size = 112, stroke = 12, children }:
  { total: Macros; size?: number; stroke?: number; children?: React.ReactNode },
) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const parts = MACROS.map((m) => ({ ...m, kcal: total[m.key] * m.kcalPerG }));
  const sum = parts.reduce((n, p) => n + p.kcal, 0);
  // A hairline of space between segments, so three colours read as three.
  const gap = sum > 0 && parts.filter((p) => p.kcal > 0).length > 1 ? 3 : 0;
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-sunken)" strokeWidth={stroke} />
        {sum > 0 && parts.map((p) => {
          const len = (p.kcal / sum) * c;
          const seg = Math.max(0, len - gap);
          const el = seg > 0 && (
            <circle
              key={p.key}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={p.color} strokeWidth={stroke} strokeLinecap="butt"
              strokeDasharray={`${seg} ${c - seg}`}
              strokeDashoffset={-offset}
              className="draw-in"
              style={{ ["--c" as string]: `${c}` }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/**
 * Protein, carbs and fat as lines that fill toward his daily targets. A macro
 * with no target shows its grams over an empty track. Past the target the line
 * stays full and the number says by how much.
 */
export function MacroTargets(
  { total, targets, day }: { total: MacroTotal; targets: Targets; day: string },
) {
  return (
    <div className="space-y-3">
      {MACROS.map((m) => {
        const value = total[m.key];
        const target = targets[m.key];
        const pct = target ? Math.min(1, value / target) : 0;
        return (
          <div key={m.key}>
            <div className="mb-1.5 flex items-baseline justify-between text-[0.8125rem]">
              <span className="flex items-center gap-2 font-medium">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                {m.label}
              </span>
              <span className="tnum text-ink-dim">
                <span className="font-semibold text-ink">{g(value)}</span>
                {target ? ` / ${g(target)} g` : " g"}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-sunken">
              {pct > 0 && (
                <div className="fill-in h-full rounded-full" style={{ width: `${pct * 100}%`, background: m.color }} />
              )}
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-0.5 text-[0.8125rem]">
        <span className="tnum flex items-center gap-2 text-ink-dim">
          <span className="h-2 w-2 rounded-full bg-fiber" />
          Fiber <span className="font-semibold text-ink">{fiberLabel(total.fiber, total.fiberComplete)}</span>
        </span>
        <Link href={`/targets?d=${day}`}
              className="press -my-2 -mr-2 flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full px-2 font-medium text-accent-ink">
          <Icon name="target" className="h-4 w-4" />
          Targets
        </Link>
      </div>
    </div>
  );
}

/** "Fat 8  Carb 30  Protein 24", with the names in their colours. For rows and cards. */
export function MacroInline({ m, className = "" }: { m: Macros; className?: string }) {
  return (
    <span className={`tnum inline-flex flex-wrap gap-x-2 text-xs text-ink-dim ${className}`}>
      {MACROS.map((x) => (
        <span key={x.key}>
          <span className="font-semibold" style={{ color: x.ink }}>{x.short}</span> {g(m[x.key])}
        </span>
      ))}
    </span>
  );
}

export const kcalText = kcal;
