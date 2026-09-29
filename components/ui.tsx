/** The handful of shapes every screen uses. Tap targets are 44px, minimum. */
import Link from "next/link";

export const inputClass =
  "w-full min-h-12 rounded-2xl border border-transparent bg-sunken px-4 py-3 text-[0.9375rem] text-ink " +
  "placeholder:text-ink-faint transition-colors focus:border-accent focus:bg-surface focus:outline-none";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger" | "soft";
};

const base =
  "press inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 " +
  "text-[0.9375rem] font-semibold disabled:opacity-40 disabled:active:scale-100";

const looks = {
  primary: "bg-accent text-white shadow-[0_1px_2px_oklch(0.4_0.1_158/0.3)]",
  ghost: "bg-surface text-ink shadow-card",
  soft: "bg-accent-soft text-accent-ink",
  danger: "bg-surface text-bad shadow-card",
};

export function Button({ variant = "ghost", className = "", ...rest }: ButtonProps) {
  return <button className={`${base} ${looks[variant]} ${className}`} {...rest} />;
}

export function LinkButton(
  { variant = "ghost", className = "", ...rest }:
  React.ComponentProps<typeof Link> & { variant?: keyof typeof looks },
) {
  return <Link className={`${base} ${looks[variant]} ${className}`} {...rest} />;
}

export function Card({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-3xl bg-surface shadow-card ${className}`} {...rest} />;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-10 text-center text-sm text-ink-dim">{children}</p>;
}

/** A screen's top bar: back (or close), title, optional action on the right. */
export function TopBar(
  { back, title, sub, close, action }:
  { back: string; title: string; sub?: string; close?: boolean; action?: React.ReactNode },
) {
  return (
    <header className="sticky top-0 z-30 -mx-4 flex items-center gap-1 bg-bg/90 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <Link href={back} aria-label={close ? "Close" : "Back"}
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink">
        <Icon name={close ? "close" : "back"} className="h-6 w-6" />
      </Link>
      <div className="min-w-0 flex-1">
        {sub && <p className="truncate text-xs font-medium text-ink-dim">{sub}</p>}
        <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
      </div>
      {action}
    </header>
  );
}

/** A top-level screen's title (Today, History, Foods). */
export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="min-w-0">
        {sub && <p className="text-sm font-medium text-ink-dim">{sub}</p>}
        <h1 className="text-[2rem] font-bold leading-tight tracking-[-0.03em]">{title}</h1>
      </div>
      {action}
    </header>
  );
}

/** A section heading inside a screen. Sentence case, not an all-caps kicker. */
export function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-1">
      <h2 className="text-[0.9375rem] font-semibold">{children}</h2>
      {right}
    </div>
  );
}

/** The one list look: white, rounded, hairlines between rows. */
export function List({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-line overflow-hidden rounded-3xl bg-surface shadow-card">{children}</ul>;
}

const ICONS: Record<string, string> = {
  back: "M15 5l-7 7 7 7",
  close: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  scan: "M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 9v6M11.5 9v6M15 9v6",
  pencil: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  today: "M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z",
  history: "M4 19V10M10 19V5M16 19v-7M22 19H2",
  foods: "M7 3v7a3 3 0 0 0 3 3v8M10 3v6M4 3v6M17 3c-2 2-2.5 5-2.5 8H19c0-3-.5-6-2-8zM17 11v10",
  chevron: "M9 6l6 6-6 6",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  check: "M5 12.5l4.5 4.5L19 7.5",
  trash: "M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13",
};

export function Icon({ name, className = "h-5 w-5", strokeWidth = 2 }:
  { name: keyof typeof ICONS | string; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={ICONS[name]} />
    </svg>
  );
}
