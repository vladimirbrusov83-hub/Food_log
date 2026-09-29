"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./ui";

const TABS = [
  { href: "/", label: "Diary", icon: "today" },
  { href: "/history", label: "History", icon: "history" },
  { href: "/foods", label: "My foods", icon: "foods" },
];

export function Nav() {
  const path = usePathname();
  // Adding, scanning and editing are full-screen tasks; the bar is in the way.
  if (["/scan", "/add", "/entry", "/login", "/targets"].some((p) => path.startsWith(p))) return null;
  if (path.startsWith("/foods/")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/85 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`press flex flex-1 flex-col items-center gap-0.5 pb-2 pt-2.5 text-[0.6875rem] font-semibold ${
                active ? "text-accent-ink" : "text-ink-faint"
              }`}
            >
              <Icon name={t.icon} className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
