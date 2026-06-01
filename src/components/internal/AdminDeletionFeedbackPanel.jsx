"use client";

import { useCallback, useEffect, useState } from "react";
import { ADMIN_LOGIN } from "../../lib/internal-admin-nav";

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

const selectClass =
  "rounded-md border border-neutral-200 bg-white px-2 py-2 text-sm text-neutral-900";

export default function AdminDeletionFeedbackPanel() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [plan, setPlan] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ plan, limit: "200" });
      const res = await fetch(`/api/internal/admin/deletion-feedback?${params}`);
      if (res.status === 401) {
        window.location.href = ADMIN_LOGIN;
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load");
        setItems([]);
        setTotal(0);
        return;
      }
      setItems(data.feedback || []);
      setTotal(data.total ?? 0);
    } catch {
      setError("Network error");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [plan]);

  useEffect(() => {
    const t = setTimeout(load, 150);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Anonymized reasons from account deletions. No email or user id is stored.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <select className={selectClass} value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="all">All plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
        </select>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-white disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
        <span className="text-sm text-neutral-400 ml-auto">
          {total} total · showing {items.length}
        </span>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        {loading && items.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-sm text-neutral-500 text-center">No feedback yet.</p>
        ) : (
          <div className="overflow-auto max-h-[calc(100vh-220px)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-neutral-50 text-left text-xs text-neutral-500 border-b border-neutral-200">
                <tr>
                  <th className="p-3 font-medium w-40">When</th>
                  <th className="p-3 font-medium w-20">Plan</th>
                  <th className="p-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-t border-neutral-100 align-top">
                    <td className="p-3 text-neutral-500 whitespace-nowrap">{formatWhen(row.created_at)}</td>
                    <td className="p-3 text-neutral-600 capitalize">{row.plan || "—"}</td>
                    <td className="p-3 text-neutral-900 leading-relaxed whitespace-pre-wrap">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
