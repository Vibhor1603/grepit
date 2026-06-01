"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminShell from "./AdminShell";
import { ADMIN_LOGIN } from "../../lib/internal-admin-nav";

export default function AdminGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLogin = pathname === ADMIN_LOGIN;
  const [ready, setReady] = useState(isLogin);

  useEffect(() => {
    if (isLogin) {
      setReady(true);
      return;
    }
    fetch("/api/internal/admin/session")
      .then((r) => {
        if (!r.ok) router.replace(ADMIN_LOGIN);
        else setReady(true);
      })
      .catch(() => router.replace(ADMIN_LOGIN));
  }, [isLogin, router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-500">
        Loading…
      </div>
    );
  }

  if (isLogin) return children;

  return <AdminShell>{children}</AdminShell>;
}
