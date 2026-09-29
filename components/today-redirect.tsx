"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toDayString } from "@/lib/day";

/**
 * The server does not know what day it is where he is standing. Vercel runs
 * UTC, so an 8pm dinner would file itself under tomorrow. The phone says which
 * day it is, once, and every screen from then on carries ?d= in the URL.
 */
export function TodayRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/?d=${toDayString(new Date())}`);
  }, [router]);
  return <p className="p-10 text-center text-sm text-ink-dim">One moment…</p>;
}
