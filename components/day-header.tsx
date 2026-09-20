"use client";

import Link from "next/link";
import { dayLabel, shiftDay, toDayString } from "@/lib/day";

/**
 * The date bar. It works out "today" in the browser rather than taking it from
 * the URL, because the server is UTC and a `today` search param would have to
 * be threaded through every link, action and redirect in the app — miss one and
 * yesterday starts calling itself Today.
 */
export function DayHeader({ day }: { day: string }) {
  const today = toDayString(new Date());
  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/?d=${shiftDay(day, -1)}`}
        aria-label="Previous day"
        className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim"
      >‹</Link>

      <Link href={`/?d=${today}`} className="text-center">
        <h1 className="display text-2xl font-semibold">{dayLabel(day, today)}</h1>
        <p className="text-[0.6875rem] text-ink-dim">{day}</p>
      </Link>

      <Link
        href={`/?d=${shiftDay(day, 1)}`}
        aria-label="Next day"
        className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim"
      >›</Link>
    </div>
  );
}
