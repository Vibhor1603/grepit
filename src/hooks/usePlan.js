"use client";
import { useQuery } from "@tanstack/react-query";

/**
 * Custom hook to get the current user's plan.
 * Caches the result for 60s so it's instant on subsequent calls.
 * 
 * Usage:
 *   const { plan, isPro, isTeam, isFree, isPaid, isLoading } = usePlan();
 */
export function usePlan() {
  const { data, isLoading } = useQuery({
    queryKey: ["user-plan"],
    queryFn: () => fetch("/api/profile/subscription").then(r => r.json()),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });

  const plan = data?.plan || "free";

  return {
    plan,
    isFree: plan === "free",
    isPro: plan === "pro",
    isTeam: plan === "team",
    isPaid: plan === "pro" || plan === "team",
    isLoading,
    status: data?.status || "active",
  };
}
