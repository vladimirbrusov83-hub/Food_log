"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { dayLabel, shiftDay, toDayString } from "@/lib/day";
import { Icon } from "./ui";

/**
 * The title and the week strip. It works out "today" in the browser rather
 * than taking it from the URL, because the server is UTC and a `today` search
 * param would have to be threaded through every link, action and redirect in
 * the app — miss one and yesterday starts calling itself Today.
 */
export function DayHeader({ day, logged }: { day: string; logged: string[] }) {
  // Worked out after mount: the server render runs in UTC, and after ~7pm in
  // the US it would call today "Yesterday" and the page would not hydrate.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(toDayString(new Date())), []);
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // Weeks start on Monday.
  const monday = shiftDay(day, -((date.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
  const has = new Set(logged);
  const full = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const label = today ? dayLabel(day, today) : "";
  const relative = label === "Today" || label === "Yesterday" || label === "Tomorrow";

  return (
    <div className="pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-end justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-dim">{relative ? full : date.getFullYear()}</p>
          <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.03em]">
            {relative ? label : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </h1>
        </div>
        {today && day !== today && (
          <Link href={`/?d=${today}`}
                className="press mb-1 flex min-h-9 items-center rounded-full bg-surface px-3.5 text-sm font-semibold text-accent-ink shadow-card">
            Today
          </Link>
        )}
      </div>

      <nav aria-label="Week" className="mt-3 flex items-center gap-0.5">
        <Link href={`/?d=${shiftDay(day, -7)}`} aria-label="Previous week"
              className="press flex h-11 w-7 shrink-0 items-center justify-center text-ink-faint">
          <Icon name="back" className="h-4 w-4" />
        </Link>
        <ol className="grid flex-1 grid-cols-7 gap-1">
          {week.map((w) => {
            const [wy, wm, dd] = w.split("-").map(Number);
            const wd = new Date(wy, wm - 1, dd).toLocaleDateString("en-US", { weekday: "narrow" });
            const active = w === day;
            const isToday = w === today;
            return (
              <li key={w}>
                <Link
                  href={`/?d=${w}`}
                  aria-current={active ? "date" : undefined}
                  className={`press flex flex-col items-center gap-1 rounded-2xl py-2 ${
                    active ? "bg-ink text-white" : "text-ink"
                  }`}
                >
                  <span className={`text-[0.6875rem] font-medium ${active ? "text-white/70" : "text-ink-faint"}`}>{wd}</span>
                  <span className={`tnum text-[0.9375rem] font-semibold ${isToday && !active ? "text-accent" : ""}`}>{dd}</span>
                  <span className={`h-1 w-1 rounded-full ${
                    has.has(w) ? (active ? "bg-white" : "bg-accent") : "bg-transparent"
                  }`} />
                </Link>
              </li>
            );
          })}
        </ol>
        <Link href={`/?d=${shiftDay(day, 7)}`} aria-label="Next week"
              className="press flex h-11 w-7 shrink-0 items-center justify-center text-ink-faint">
          <Icon name="chevron" className="h-4 w-4" />
        </Link>
      </nav>
    </div>
  );
}
