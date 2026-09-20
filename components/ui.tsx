/** The handful of shapes every screen uses. Tap targets are 44px, minimum. */
import Link from "next/link";

export const inputClass =
  "w-full min-h-11 rounded-xl border border-line bg-surface px-3 py-2.5 text-ink " +
  "placeholder:text-ink-dim focus:border-accent focus:outline-none";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({ variant = "ghost", className = "", ...rest }: ButtonProps) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 " +
    "text-sm font-semibold transition active:scale-[0.98] disabled:opacity-40";
  const look = {
    primary: "bg-accent text-bg",
    ghost: "border border-line bg-surface text-ink",
    danger: "border border-line bg-surface text-bad",
  }[variant];
  return <button className={`${base} ${look} ${className}`} {...rest} />;
}

export function LinkButton(
  { variant = "ghost", className = "", ...rest }:
  React.ComponentProps<typeof Link> & { variant?: "primary" | "ghost" },
) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 " +
    "text-sm font-semibold transition active:scale-[0.98]";
  const look = variant === "primary"
    ? "bg-accent text-bg"
    : "border border-line bg-surface text-ink";
  return <Link className={`${base} ${look} ${className}`} {...rest} />;
}

export function Card({ className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-2xl border border-line bg-surface ${className}`} {...rest} />;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-6 text-center text-sm text-ink-dim">{children}</p>;
}
