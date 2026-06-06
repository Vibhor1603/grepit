import { describe, expect, it } from "vitest";
import { sanitizeMermaidCode } from "../../src/utils/client/mermaid.js";

describe("sanitizeMermaidCode sequence diagrams", () => {
  it("splits inline end after a message with a numeric status code", () => {
    const input = [
      "sequenceDiagram",
      "    Client->>API: 401 Unauthorized' error\"    end",
    ].join("\n");

    const out = sanitizeMermaidCode(input);
    expect(out).toContain('Client->>API: "401 Unauthorized\' error"');
    expect(out).toMatch(/\n\s*end\s*$/);
    expect(out).not.toMatch(/error"\s+end[^\n]/);
  });

  it("splits inline end when there is no space after the colon", () => {
    const input = [
      "sequenceDiagram",
      "    API-->>Client:401 Unauthorized' error\"    end",
    ].join("\n");

    const out = sanitizeMermaidCode(input);
    expect(out).toContain('API-->>Client: "401 Unauthorized\' error"');
    expect(out).toMatch(/\n\s*end\s*$/);
  });

  it("splits inline end on else branches", () => {
    const input = [
      "sequenceDiagram",
      "    alt token present",
      "        API->>Client: OK",
      "    else Unauthorized' error\"    end",
    ].join("\n");

    const out = sanitizeMermaidCode(input);
    expect(out).toContain('else "Unauthorized\' error"');
    expect(out).toContain("\n    end");
  });

  it("handles single-arrow syntax and block descriptions", () => {
    const input = [
      "sequenceDiagram",
      "    participant Client",
      "    participant API",
      "    Client->API: GET /auth",
      "    opt invalid session end",
    ].join("\n");

    const out = sanitizeMermaidCode(input);
    expect(out).toContain('Client->API: "GET /auth"');
    expect(out).toContain('opt "invalid session"');
    expect(out).toMatch(/opt "invalid session"\n\s*end/);
  });
});
