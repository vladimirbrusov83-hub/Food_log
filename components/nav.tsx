"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today", icon: "M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/history", label: "History", icon: "M12 7v5l3 3M3 12a9 9 0 1 0 2.6-6.4M3 4v4h4" },
  { href: "/foods", label: "Foods", icon: "M5 3v8a3 3 0 0 0 3 3v7M8 3v6M16 3c-1.5 2-2 4-2 7h4c0-3-.5-5-2-7zM16 10v11" },
];

export function Nav() {
  const path = usePathname();
  // The scanner and the add sheet are full-screen tasks; the bar is in the way.
  if (path.startsWith("/scan") || path.startsWith("/add") || path === "/login") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.6875rem] font-semibold ${
                active ? "text-accent" : "text-ink-dim"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                   strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d={t.icon} />
              </svg>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
