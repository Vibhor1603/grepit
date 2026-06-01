"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/internal/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.replace("/internal-admin");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <p className="text-sm font-semibold mb-1">grepit</p>
        <h1 className="text-lg font-medium mb-6">Sign in to admin</h1>
        {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}
        <label className="block text-xs font-medium text-neutral-600 mb-1">Username</label>
        <input
          className="w-full mb-4 rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <label className="block text-xs font-medium text-neutral-600 mb-1">Password</label>
        <input
          type="password"
          className="w-full mb-6 rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-neutral-900 text-white font-medium py-2.5 text-sm disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
