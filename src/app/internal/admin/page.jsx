"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminEmailPreview from "../../../components/internal/AdminEmailPreview";
import { DEFAULT_EMAIL_BODY } from "../../../lib/admin-email-template";

export default function AdminEmailPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");
  const [selected, setSelected] = useState(() => new Set());
  const [subject, setSubject] = useState("An update from grepit");
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_EMAIL_BODY);
  const [useBrand] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/internal/admin/session")
      .then((r) => {
        if (!r.ok) router.replace("/internal/admin/login");
        else setAuthChecked(true);
      })
      .catch(() => router.replace("/internal/admin/login"));
  }, [router]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const params = new URLSearchParams({ q, status, plan });
    const res = await fetch(`/api/internal/admin/users?${params}`);
    if (res.status === 401) {
      router.replace("/internal/admin/login");
      return;
    }
    const data = await res.json();
    setUsers(data.users || []);
    setTotal(data.total ?? 0);
    setMeta(data.meta || null);
    setLoadingUsers(false);
  }, [q, status, plan, router]);

  useEffect(() => {
    if (!authChecked) return;
    const t = setTimeout(loadUsers, 300);
    return () => clearTimeout(t);
  }, [authChecked, loadUsers]);

  const selectedList = useMemo(
    () => users.filter((u) => selected.has(u.id)),
    [users, selected],
  );

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(users.map((u) => u.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  async function handleLogout() {
    await fetch("/api/internal/admin/logout", { method: "POST" });
    router.replace("/internal/admin/login");
  }

  async function handleSend(dryRun = false) {
    setMessage("");
    setSending(true);
    try {
      const payload = {
        subject,
        bodyHtml,
        useBrandTemplate: useBrand,
        dryRun,
        recipientIds: selected.size > 0 ? [...selected] : null,
        filters: selected.size > 0 ? null : { q, status, plan },
      };
      const res = await fetch("/api/internal/admin/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Send failed");
        return;
      }
      if (dryRun) {
        setMessage(`Preview: would send to ${data.count} recipient(s).`);
        return;
      }
      const failNote =
        data.failed?.length > 0
          ? ` (${data.failed.length} failed)`
          : "";
      setMessage(`Sent ${data.sent} of ${data.total}${failNote}`);
    } catch {
      setMessage("Network error");
    } finally {
      setSending(false);
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-[#737373] text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5]">
      <header className="border-b border-[#262626] px-4 py-3 flex items-center justify-between gap-4">
        <div>
          <span className="text-[#c8f542] font-semibold">grepit</span>
          <span className="text-[#525252] mx-2">·</span>
          <span className="text-sm text-[#a3a3a3]">Email admin</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="text-xs text-[#737373] hover:text-[#e5e5e5]"
        >
          Log out
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-4 grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)] lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-[#262626] bg-[#141414] p-4 xl:col-span-1">
          <h2 className="text-sm font-medium mb-3">Compose</h2>
          <p className="text-[11px] text-[#737373] mb-3 leading-relaxed">
            From <strong className="text-[#a3a3a3]">vibhorsharma@grepit.co</strong>.
            Edit subject and body only — grepit branding is applied automatically.
          </p>
          <label className="text-xs text-[#737373]">Subject</label>
          <input
            className="w-full mt-1 mb-3 rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <label className="text-xs text-[#737373]">
            Message{" "}
            <span className="text-[#525252]">
              — <code className="text-[#C47A12]">{"{{firstName}}"}</code>,{" "}
              <code className="text-[#C47A12]">{"{{name}}"}</code>,{" "}
              <code className="text-[#C47A12]">{"{{email}}"}</code>
            </span>
          </label>
          <textarea
            className="w-full mt-1 mb-2 rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm font-mono min-h-[160px]"
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={sending}
              onClick={() => handleSend(true)}
              className="rounded-lg border border-[#404040] px-3 py-2 text-xs hover:border-[#737373] disabled:opacity-50"
            >
              Preview count
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => handleSend(false)}
              className="rounded-lg bg-[#c8f542] text-[#0a0a0a] px-4 py-2 text-xs font-medium disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
          {message ? (
            <p className="mt-3 text-xs text-[#a3a3a3]">{message}</p>
          ) : null}
          <p className="mt-2 text-[10px] text-[#525252]">
            {selected.size > 0
              ? `Sending to ${selected.size} selected user(s).`
              : `No selection — sends to all ${users.length} visible (max 200 per batch).`}
          </p>
        </section>

        <section className="rounded-xl border border-[#262626] bg-[#141414] p-4 xl:col-span-1 lg:col-span-2 xl:col-start-2">
          <AdminEmailPreview
            subject={subject}
            bodyHtml={bodyHtml}
            useBrandTemplate={useBrand}
            previewRecipient={selectedList[0] ?? users[0] ?? null}
          />
        </section>

        <section className="rounded-xl border border-[#262626] bg-[#141414] p-4 flex flex-col min-h-[480px] xl:col-span-1 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="text-sm font-medium mr-auto">
              Recipients ({users.length} shown · {total} total)
            </h2>
            <button type="button" onClick={selectAllVisible} className="text-[11px] text-[#c8f542]">
              Select all visible
            </button>
            <button type="button" onClick={clearSelection} className="text-[11px] text-[#737373]">
              Clear
            </button>
          </div>
          {meta ? (
            <p className="text-[10px] text-[#525252] mb-3 leading-relaxed">
              Clerk ({meta.clerkKey}): {meta.clerk}
              {meta.skippedNoEmail > 0 ? ` · ${meta.skippedNoEmail} without email (hidden)` : ""}
              {meta.includeDb ? ` · DB-only: ${meta.database}` : ""} · Deleted: {meta.deleted}
              {!meta.usingAdminClerkKey ? (
                <>
                  {" "}
                  · Add{" "}
                  <code className="text-[#c8f542]">ADMIN_CLERK_SECRET_KEY=sk_live_…</code> in{" "}
                  <code className="text-[#737373]">.env.local</code>
                </>
              ) : !meta.includeDb ? (
                <>
                  {" "}
                  · Set <code className="text-[#c8f542]">ADMIN_USERS_INCLUDE_DB=true</code> to
                  merge extra emails from the database
                </>
              ) : null}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 mb-3">
            <input
              placeholder="Search email or name"
              className="flex-1 min-w-[140px] rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-1.5 text-xs"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="rounded-lg border border-[#333] bg-[#0a0a0a] px-2 py-1.5 text-xs"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="deleted">Deleted account</option>
            </select>
            <select
              className="rounded-lg border border-[#333] bg-[#0a0a0a] px-2 py-1.5 text-xs"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="all">All plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div className="flex-1 overflow-auto border border-[#262626] rounded-lg">
            {loadingUsers ? (
              <p className="p-4 text-xs text-[#737373]">Loading users…</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-[#1a1a1a] text-[#737373]">
                  <tr>
                    <th className="p-2 w-8" />
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">Plan</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-[#262626] hover:bg-[#1a1a1a]">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleOne(u.id)}
                        />
                      </td>
                      <td className="p-2 text-[#e5e5e5]">{u.email}</td>
                      <td className="p-2 text-[#a3a3a3]">{u.name}</td>
                      <td className="p-2 text-[#737373]">{u.plan}</td>
                      <td className="p-2">
                        <span
                          className={
                            u.status === "deleted"
                              ? "text-amber-500"
                              : "text-emerald-500"
                          }
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="p-2 text-[#525252]">{u.source || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {selectedList.length > 0 ? (
            <p className="mt-2 text-[10px] text-[#525252] truncate">
              Selected: {selectedList.map((u) => u.email).join(", ")}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
