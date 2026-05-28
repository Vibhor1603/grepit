import { describe, it, expect } from "vitest";
import { buildQueryResponse } from "../../src/lib/analysis";

const analysis = {
  repo_name: "test-repo",
  summary: "Repository summary",
  file_tree: [
    { path: "src/app/api/upload/route.js", type: "blob" },
    { path: "src/controllers/upload.controller.js", type: "blob" },
  ],
  architecture: {
    techStack: ["Node.js"],
    layers: [{ name: "API" }],
  },
  results: {
    files: [
      {
        path: "src/app/api/upload/route.js",
        summary: "Upload route",
        why: "Thin API wrapper",
        functions: [{ name: "POST" }],
        classes: [],
        imports: ["../../../controllers/upload.controller"],
      },
      {
        path: "src/controllers/upload.controller.js",
        summary: "Upload controller",
        why: "Handles upload processing",
        functions: [{ name: "handleUploadPost" }],
        classes: [],
        imports: [],
      },
    ],
    symbolIndex: [
      { name: "POST", file: "src/app/api/upload/route.js", type: "function" },
      { name: "handleUploadPost", file: "src/controllers/upload.controller.js", type: "function" },
    ],
    dependencyGraph: [
      { from: "src/app/api/upload/route.js", to: "../../../controllers/upload.controller" },
    ],
    callGraph: [],
  },
};

describe("buildQueryResponse", () => {
  it("returns grounded file and symbol matches instead of canned keyword answers", () => {
    const response = buildQueryResponse(analysis, "how does upload work?");
    expect(response).toContain("Here are the strongest indexed matches");
    expect(response).toContain("src/controllers/upload.controller.js");
    expect(response).toContain("Relevant files:");
  });

  it("admits when no confident indexed match exists", () => {
    const response = buildQueryResponse(analysis, "where is billing webhook retry policy defined?");
    expect(response).toContain("couldn't find a confident indexed match");
  });
});
