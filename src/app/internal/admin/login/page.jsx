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
      router.replace("/internal/admin");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-[#262626] bg-[#141414] p-8"
      >
        <p className="text-[#c8f542] font-semibold text-lg mb-1">grepit</p>
        <h1 className="text-xl font-semibold mb-6">Internal admin</h1>
        {error ? (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        ) : null}
        <label className="block text-xs text-[#737373] mb-1">Username</label>
        <input
          className="w-full mb-4 rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm outline-none focus:border-[#c8f542]"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />
        <label className="block text-xs text-[#737373] mb-1">Password</label>
        <input
          type="password"
          className="w-full mb-6 rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-2 text-sm outline-none focus:border-[#c8f542]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[#c8f542] text-[#0a0a0a] font-medium py-2.5 text-sm disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
