import { describe, it, expect } from "vitest";
import {
  buildChatSuggestions,
  NEW_HERE_CHIP,
  ONBOARDING_CHIP,
} from "../../src/lib/chat-suggestions";

describe("buildChatSuggestions", () => {
  it("returns exactly 4 chips", () => {
    expect(buildChatSuggestions(null)).toHaveLength(4);
    expect(buildChatSuggestions({})).toHaveLength(4);
  });

  it("always includes onboarding and new-here chips", () => {
    const chips = buildChatSuggestions(null);
    expect(chips[0]).toBe(NEW_HERE_CHIP);
    expect(chips[1]).toBe(ONBOARDING_CHIP);

    const repoChips = buildChatSuggestions({ repo_name: "my-app" });
    expect(repoChips[0]).toBe(NEW_HERE_CHIP);
    expect(repoChips[1]).toBe(ONBOARDING_CHIP);
  });

  it("prioritizes auth when repo has auth files", () => {
    const analysis = {
      repo_name: "auth-app",
      file_tree: [
        { path: "src/middleware/auth.js", type: "blob" },
        { path: "src/app/login/page.jsx", type: "blob" },
      ],
      architecture: { apiEndpoints: [] },
    };
    const chips = buildChatSuggestions(analysis);
    expect(chips).toContain("Walk me through the auth flow");
  });

  it("prioritizes API routes when endpoints exist", () => {
    const analysis = {
      repo_name: "api-app",
      file_tree: [{ path: "src/app/api/users/route.js", type: "blob" }],
      architecture: { apiEndpoints: [{ path: "/api/users", method: "GET" }] },
    };
    const chips = buildChatSuggestions(analysis);
    expect(chips).toContain("How do the api-app API routes work?");
  });

  it("uses detected flow paths when available", () => {
    const analysis = {
      repo_name: "web-app",
      file_tree: [],
      architecture: {
        apiEndpoints: [],
        flowPaths: [{ name: "GitHub sign-in", steps: ["a", "b"] }],
      },
    };
    const chips = buildChatSuggestions(analysis);
    expect(chips).toContain("Trace the GitHub sign-in flow");
  });
});
