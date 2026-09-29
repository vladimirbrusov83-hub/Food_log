import Link from "next/link";
import { getLoggedDays } from "@/lib/db";
import { g, kcal } from "@/lib/macros";
import { MACROS, MacroInline } from "@/components/macro-bar";
import { List, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

const label = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

export default async function HistoryPage() {
  const days = await getLoggedDays();
  const recent = days.slice(0, 7);
  const avg = (k: "kcal" | "protein" | "carb" | "fat") =>
    recent.reduce((n, d) => n + d[k], 0) / Math.max(1, recent.length);

  return (
    <main className="mx-auto max-w-md px-4 pb-6">
      <PageTitle title="History" sub={days.length ? `${days.length} days logged` : undefined} />

      {days.length === 0 ? (
        <div className="rounded-3xl bg-surface px-6 py-10 text-center shadow-card">
          <p className="font-semibold">Nothing logged yet</p>
          <p className="mt-1 text-sm text-ink-dim">Every day you log shows up here with its totals.</p>
        </div>
      ) : (
        <>
          <section className="mb-5 rounded-3xl bg-surface p-5 shadow-card">
            <p className="text-sm font-medium text-ink-dim">
              Average of your last {recent.length} logged {recent.length === 1 ? "day" : "days"}
            </p>
            <p className="mt-1">
              <span className="tnum text-[2rem] font-bold tracking-[-0.03em]">{kcal(avg("kcal")).toLocaleString("en-US")}</span>
              <span className="ml-1.5 text-sm font-medium text-ink-dim">kcal</span>
            </p>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              {MACROS.map((x) => (
                <div key={x.key} className="rounded-2xl bg-sunken px-3 py-2">
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-dim">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: x.color }} />{x.label}
                  </dt>
                  <dd className="tnum text-[0.9375rem] font-semibold">{g(Math.round(avg(x.key)))} g</dd>
                </div>
              ))}
            </dl>
          </section>

          <List>
            {days.map((d) => {
              const energy = MACROS.map((x) => d[x.key] * x.kcalPerG);
              const sum = energy.reduce((a, b) => a + b, 0) || 1;
              return (
                <li key={d.day}>
                  <Link href={`/?d=${d.day}`} className="press block px-5 py-3.5 active:bg-sunken">
                    <span className="flex items-baseline justify-between">
                      <span className="text-[0.9375rem] font-medium">{label(d.day)}</span>
                      <span className="tnum text-[0.9375rem] font-semibold">
                        {kcal(d.kcal).toLocaleString("en-US")}<span className="ml-0.5 text-xs font-medium text-ink-faint">kcal</span>
                      </span>
                    </span>
                    {/* The day's split by calories: at a glance, "mostly carbs". */}
                    <span className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
                      {MACROS.map((x, i) => (
                        <span key={x.key} style={{ width: `${(energy[i] / sum) * 100}%`, background: x.color }} />
                      ))}
                    </span>
                    <MacroInline m={{ ...d, fiber: null }} className="mt-1.5" />
                  </Link>
                </li>
              );
            })}
          </List>
        </>
      )}
    </main>
  );
}
