import { describe, it, expect, vi, beforeEach } from "vitest";

describe("stripe checkout route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.doMock("@clerk/nextjs/server", () => ({
      auth: () => Promise.resolve({ userId: null }),
      clerkClient: () => {},
    }));

    const { POST } = await import("../src/app/api/stripe/checkout/route");
    const request = new Request("http://localhost:3000/api/stripe/checkout", {
      method: "POST",
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});

describe("stripe webhook route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    const { POST } = await import("../src/app/api/stripe/webhook/route");
    const request = new Request("http://localhost:3000/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
