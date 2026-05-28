import { describe, it, expect } from "vitest";
import { normalizeAssistantOpening, parseFollowUps } from "../../src/utils/client/formatting";

describe("client formatting helpers", () => {
  it("strips boilerplate evidence openings", () => {
    const text = "Based on the full code of src/controllers/upload.controller.js that was provided in the context, here's the answer:\nUploads are handled in the controller.";
    expect(normalizeAssistantOpening(text)).toBe("Uploads are handled in the controller.");
  });

  it("parses follow-up suggestions header", () => {
    const parsed = parseFollowUps([
      "Main answer here.",
      "",
      "## Follow-up suggestions",
      "- Show me the upload flow",
      "- Trace the controller path",
      "- Where is validation done",
    ].join("\n"));

    expect(parsed.body).toBe("Main answer here.");
    expect(parsed.followUps).toEqual([
      "Show me the upload flow",
      "Trace the controller path",
      "Where is validation done",
    ]);
  });
});
