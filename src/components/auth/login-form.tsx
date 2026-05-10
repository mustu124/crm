"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { isAllowedUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export function LoginForm() {
  const { loading, session } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nextPath = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    if (!loading && session) {
      router.replace("/dashboard");
    }
  }, [loading, router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    if (!isAllowedUser(email)) {
      setError("Invalid credentials");
      setSubmitting(false);
      return;
    }

    const { data, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError || !isAllowedUser(data.user?.email)) {
      await supabase.auth.signOut();
      setError("Invalid credentials");
      setSubmitting(false);
      return;
    }

    router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-lg font-black text-accent-foreground shadow-card">
            A
          </div>
          <div>
            <p className="text-xl font-black tracking-tight">AppName</p>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Private access
            </p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
            Login
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            Welcome back.
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
            Use one of the approved AppName accounts to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
          <label className="grid gap-2 text-sm font-black">
            Email
            <span className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-background/70 px-4">
              <Mail className="h-5 w-5 text-muted-foreground" aria-hidden />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                required
                autoComplete="email"
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </span>
          </label>

          <label className="grid gap-2 text-sm font-black">
            Password
            <span className="flex min-h-12 items-center gap-3 rounded-2xl border border-border bg-background/70 px-4">
              <LockKeyhole
                className="h-5 w-5 text-muted-foreground"
                aria-hidden
              />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                required
                autoComplete="current-password"
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </span>
          </label>

          {error ? (
            <p className="rounded-2xl bg-red-50 p-3 text-sm font-black text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || loading}
            className="mt-2 min-h-12 rounded-2xl bg-accent px-5 text-sm font-black text-accent-foreground shadow-card disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Log in"}
          </button>
        </form>
      </section>
    </main>
  );
}
