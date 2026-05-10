"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, pathname, router, session]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-accent">
            AppName
          </p>
          <p className="mt-2 text-xl font-black">Checking access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
