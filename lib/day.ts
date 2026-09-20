/** Date helpers. Every one of them works on the phone's own local calendar. */

/** "YYYY-MM-DD" for a Date, in local time. `toISOString` would be UTC. */
export function toDayString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return toDayString(new Date(y, m - 1, d + days));
}

export const isDayString = (s: string | undefined): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** "Today", "Yesterday", else "Sat 20 Sep". `today` is passed in, never guessed. */
export function dayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === shiftDay(today, -1)) return "Yesterday";
  if (day === shiftDay(today, 1)) return "Tomorrow";
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${weekday} ${d} ${month}`;
}
