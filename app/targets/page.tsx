import { saveTargets } from "@/app/actions";
import { getTargets } from "@/lib/db";
import { isDayString } from "@/lib/day";
import { MACROS } from "@/components/macro-bar";
import { Card, TopBar, inputClass } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TargetsPage(
  { searchParams }: { searchParams: Promise<{ d?: string }> },
) {
  const { d } = await searchParams;
  const day = isDayString(d) ? d : "";
  const t = await getTargets();

  return (
    <main className="mx-auto max-w-md px-4">
      <TopBar back={day ? `/?d=${day}` : "/"} close title="Daily targets" />

      <form action={saveTargets} className="space-y-4 pt-2">
        <input type="hidden" name="day" value={day} />
        <Card className="divide-y divide-line px-5">
          {MACROS.map((m) => (
            <label key={m.key} className="flex min-h-16 items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
              <span className="flex-1 text-[0.9375rem] font-medium">{m.label}</span>
              <span className="relative w-32">
                <input name={m.key} type="number" inputMode="decimal" step="any" min="0"
                       defaultValue={t[m.key] ?? ""} placeholder="—"
                       className={`${inputClass} tnum pr-9 text-right`} />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-ink-dim">g</span>
              </span>
            </label>
          ))}
        </Card>
        <p className="px-1 text-[0.8125rem] leading-relaxed text-ink-dim">
          The lines on the day screen fill toward these. Leave one blank and its line just shows grams.
        </p>
        <button type="submit"
                className="press flex min-h-14 w-full items-center justify-center rounded-2xl bg-accent text-base font-semibold text-white shadow-float">
          Save targets
        </button>
      </form>
    </main>
  );
}
