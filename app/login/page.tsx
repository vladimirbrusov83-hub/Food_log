import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE, authToken, checkPasscode, isAuthToken } from "@/lib/auth";
import { Button, inputClass } from "@/components/ui";

export const dynamic = "force-dynamic";

async function signIn(formData: FormData) {
  "use server";
  const entered = String(formData.get("passcode") ?? "");
  if (!(await checkPasscode(entered))) redirect("/login?wrong=1");

  const jar = await cookies();
  jar.set(AUTH_COOKIE, await authToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/");
}

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ wrong?: string }> }) {
  const jar = await cookies();
  if (await isAuthToken(jar.get(AUTH_COOKIE)?.value)) redirect("/");
  const { wrong } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-float">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-7 w-7" aria-hidden>
            <path d="M7 3v7a3 3 0 0 0 3 3v8M10 3v6M4 3v6M17 3c-2 2-2.5 5-2.5 8H19c0-3-.5-6-2-8zM17 11v10" />
          </svg>
        </span>
        <h1 className="mt-6 text-[2.5rem] font-bold leading-tight tracking-[-0.03em]">FoodLog</h1>
        <p className="mt-1 text-[0.9375rem] text-ink-dim">Enter the passcode to continue.</p>
      </div>

      <form action={signIn} className="mt-8 space-y-3">
        <input
          name="passcode"
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Passcode"
          className={`${inputClass} bg-surface shadow-card`}
        />
        {wrong && <p className="text-sm text-bad">That passcode is not right.</p>}
        <Button type="submit" variant="primary" className="w-full min-h-14">Continue</Button>
      </form>
    </main>
  );
}
