"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_LOGIN, ADMIN_NAV } from "../../lib/internal-admin-nav";

function isActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/internal/admin/logout", { method: "POST" });
    router.replace(ADMIN_LOGIN);
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex">
      <aside className="w-52 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
        <div className="px-4 py-5 border-b border-neutral-100">
          <p className="text-sm font-semibold tracking-tight">grepit</p>
          <p className="text-xs text-neutral-500 mt-0.5">Internal admin</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {ADMIN_NAV.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-neutral-100 font-medium text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 border-b border-neutral-200 bg-white px-6 py-4">
          <h1 className="text-base font-medium text-neutral-900">
            {ADMIN_NAV.find((item) => isActive(pathname, item))?.label ?? "Admin"}
          </h1>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
