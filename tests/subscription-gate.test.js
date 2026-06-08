import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
};

vi.mock("../src/lib/db", () => ({ getDb: () => mockDb }));

describe("subscription-gate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.resetModules();
  });

  describe("isUserPro", () => {
    it("returns false for null userId", async () => {
      mockDb.select.mockReturnValue({ from: () => ({ where: () => ({ limit: () => [] }) }) });
      const { isUserPro } = await import("../src/lib/subscription-gate");
      const result = await isUserPro(null);
      expect(result).toBe(false);
    });

    it("returns false when no subscription exists", async () => {
      mockDb.select.mockReturnValue({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
      });
      const { isUserPro } = await import("../src/lib/subscription-gate");
      const result = await isUserPro("user_123");
      expect(result).toBe(false);
    });

    it("returns true when active pro subscription exists", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      mockDb.select.mockReturnValue({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([{ 
                user_id: "user_123", 
                entitlement_plan: "pro", 
                entitlement_ends_at: tomorrow.toISOString() 
              }]),
          }),
        }),
      });
      const { isUserPro } = await import("../src/lib/subscription-gate");
      const result = await isUserPro("user_123");
      expect(result).toBe(true);
    });

    it("returns false when subscription is cancelled", async () => {
      mockDb.select.mockReturnValue({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([{ 
                user_id: "user_123", 
                entitlement_plan: "free", 
                entitlement_ends_at: null 
              }]),
          }),
        }),
      });
      const { isUserPro } = await import("../src/lib/subscription-gate");
      const result = await isUserPro("user_123");
      expect(result).toBe(false);
    });
  });

  describe("checkGate", () => {
    it("allows any feature for pro users", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockDb.select.mockReturnValue({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([{ 
                user_id: "pro_user", 
                entitlement_plan: "pro", 
                entitlement_ends_at: tomorrow.toISOString() 
              }]),
          }),
        }),
      });
      const { checkGate } = await import("../src/lib/subscription-gate");
      const result = await checkGate("pro_user", "repo_analyze");
      expect(result.allowed).toBe(true);
      expect(result.plan).toBe("pro");
    });

    it("blocks free users from pdf_export", async () => {
      mockDb.select.mockReturnValue({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
      });
      const { checkGate } = await import("../src/lib/subscription-gate");
      const result = await checkGate("free_user", "pdf_export");
      expect(result.allowed).toBe(false);
      expect(result.code).toBe("PRO_FEATURE_ONLY");
    });

    it("allows free users within limits", async () => {
      mockDb.select.mockReturnValue({
        from: () => ({ where: () => ({ limit: () => Promise.resolve([]) }) }),
      });
      const { checkGate } = await import("../src/lib/subscription-gate");
      const result = await checkGate("free_user", "repo_analyze");
      expect(result.allowed).toBe(true);
      expect(result.plan).toBe("free");
    });
  });

  describe("FREE_LIMITS", () => {
    it("defines expected free tier limits", async () => {
      const { FREE_LIMITS } = await import("../src/lib/subscription-gate");
      expect(FREE_LIMITS.maxRepos).toBe(2);
      expect(FREE_LIMITS.maxAiQueriesPerDay).toBe(Infinity);
      expect(FREE_LIMITS.maxChatConversations).toBe(5);
      expect(FREE_LIMITS.pdfExport).toBe(false);
    });
  });

  describe("getAiQueryCountToday", () => {
    it("returns 0 when no queries logged", async () => {
      mockDb.select.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ count: 0 }]),
        }),
      });
      const { getAiQueryCountToday } = await import("../src/lib/subscription-gate");
      const result = await getAiQueryCountToday("user_123");
      expect(result).toBe(0);
    });

    it("returns the count from database", async () => {
      mockDb.select.mockReturnValue({
        from: () => ({
          where: () => Promise.resolve([{ count: 15 }]),
        }),
      });
      const { getAiQueryCountToday } = await import("../src/lib/subscription-gate");
      const result = await getAiQueryCountToday("user_123");
      expect(result).toBe(15);
    });
  });
});
