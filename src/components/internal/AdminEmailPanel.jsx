"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminEmailPreview from "./AdminEmailPreview";
import { DEFAULT_EMAIL_BODY } from "../../lib/admin-email-template";
import { ADMIN_LOGIN } from "../../lib/internal-admin-nav";

const inputClass =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-400";

export default function AdminEmailPanel() {
  const router = useRouter();
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

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    const params = new URLSearchParams({ q, status, plan });
    const res = await fetch(`/api/internal/admin/users?${params}`);
    if (res.status === 401) {
      router.replace(ADMIN_LOGIN);
      return;
    }
    const data = await res.json();
    setUsers(data.users || []);
    setTotal(data.total ?? 0);
    setMeta(data.meta || null);
    setLoadingUsers(false);
  }, [q, status, plan, router]);

  useEffect(() => {
    const t = setTimeout(loadUsers, 300);
    return () => clearTimeout(t);
  }, [loadUsers]);

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
        setMessage(`Would send to ${data.count} recipient(s).`);
        return;
      }
      const failNote = data.failed?.length > 0 ? ` (${data.failed.length} failed)` : "";
      setMessage(`Sent ${data.sent} of ${data.total}${failNote}`);
    } catch {
      setMessage("Network error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <section className="rounded-lg border border-neutral-200 bg-white p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-sm font-medium text-neutral-900">Compose</h2>
            <p className="text-sm text-neutral-500 mt-1">
              From <span className="font-medium text-neutral-700">vibhorsharma@grepit.co</span>
              {" · "}
              Branding applied automatically
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              disabled={sending}
              onClick={() => handleSend(true)}
              className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              Count recipients
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={() => handleSend(false)}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send email"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Subject</label>
            <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Message{" "}
              <span className="font-normal text-neutral-400">
                — {"{{firstName}}"}, {"{{name}}"}, {"{{email}}"}
              </span>
            </label>
            <textarea
              className={`${inputClass} font-mono min-h-[140px] resize-y`}
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
            />
          </div>
        </div>

        {message ? <p className="mt-4 text-sm text-neutral-600">{message}</p> : null}
        <p className="mt-3 text-xs text-neutral-400">
          {selected.size > 0
            ? `${selected.size} selected — only those users will receive this email.`
            : `No selection — sends to all ${users.length} visible users (max 200 per batch).`}
        </p>
      </section>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <section className="rounded-lg border border-neutral-200 bg-white p-5 lg:sticky lg:top-6">
          <h2 className="text-sm font-medium text-neutral-900 mb-4">Preview</h2>
          <AdminEmailPreview
            subject={subject}
            bodyHtml={bodyHtml}
            useBrandTemplate={useBrand}
            previewRecipient={selectedList[0] ?? users[0] ?? null}
          />
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5 flex flex-col min-h-[420px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
            <h2 className="text-sm font-medium text-neutral-900 mr-auto">
              Recipients
              <span className="font-normal text-neutral-500 ml-1">
                ({users.length} shown · {total} total)
              </span>
            </h2>
            <button type="button" onClick={selectAllVisible} className="text-xs text-neutral-700 hover:underline">
              Select all
            </button>
            <button type="button" onClick={clearSelection} className="text-xs text-neutral-500 hover:underline">
              Clear
            </button>
          </div>

          {meta ? (
            <p className="text-xs text-neutral-400 mb-3 leading-relaxed">
              Clerk ({meta.clerkKey}): {meta.clerk}
              {meta.skippedNoEmail > 0 ? ` · ${meta.skippedNoEmail} without email` : ""}
              {meta.includeDb ? ` · DB-only: ${meta.database}` : ""}
            </p>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              placeholder="Search email or name"
              className={`${inputClass} flex-1`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm min-w-[120px]"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
            </select>
            <select
              className="rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm min-w-[100px]"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            >
              <option value="all">All plans</option>
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
            </select>
          </div>

          <div className="flex-1 overflow-auto rounded-md border border-neutral-200 min-h-[280px]">
            {loadingUsers ? (
              <p className="p-4 text-sm text-neutral-500">Loading users…</p>
            ) : users.length === 0 ? (
              <p className="p-4 text-sm text-neutral-500">No users match your filters.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-50 text-left text-xs text-neutral-500 border-b border-neutral-200">
                  <tr>
                    <th className="p-2 w-10" />
                    <th className="p-2 font-medium">Email</th>
                    <th className="p-2 font-medium hidden sm:table-cell">Name</th>
                    <th className="p-2 font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleOne(u.id)}
                          className="rounded border-neutral-300"
                        />
                      </td>
                      <td className="p-2 text-neutral-900">{u.email}</td>
                      <td className="p-2 text-neutral-500 hidden sm:table-cell">{u.name}</td>
                      <td className="p-2 text-neutral-500 capitalize">{u.plan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selectedList.length > 0 ? (
            <p className="mt-3 text-xs text-neutral-500 truncate" title={selectedList.map((u) => u.email).join(", ")}>
              Selected: {selectedList.map((u) => u.email).join(", ")}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
