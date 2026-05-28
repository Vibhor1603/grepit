import { describe, it, expect } from "vitest";
import { createFolderUploadSnapshot, createUploadSnapshot, scopeSnapshotToPaths } from "../../src/lib/repository-snapshot";

function createMockFile(name, content) {
  const buffer = Buffer.from(content, "utf8");
  return {
    name,
    size: buffer.length,
    async arrayBuffer() {
      return buffer;
    },
  };
}

async function createZipFile(name, entries) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (const [path, content] of entries) {
    zip.file(path, content);
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return {
    name,
    size: buffer.length,
    async arrayBuffer() {
      return buffer;
    },
  };
}

describe("repository snapshot uploads", () => {
  it("keeps src/ paths for zips that do not have a wrapper folder", async () => {
    const file = await createZipFile("project.zip", [
      ["src/app/api/upload/route.js", "export async function POST() {}"],
      ["src/controllers/upload.controller.js", "export async function handleUploadPost() {}"],
    ]);

    const snapshot = await createUploadSnapshot(file);
    expect(snapshot.fileTree.some((entry) => entry.path === "src/app/api/upload/route.js")).toBe(true);
    expect(snapshot.fileTree.some((entry) => entry.path === "app/api/upload/route.js")).toBe(false);
  });

  it("strips the selected folder root for folder uploads", async () => {
    const snapshot = await createFolderUploadSnapshot([
      createMockFile("demo-repo/src/app/api/upload/route.js", "export async function POST() {}"),
      createMockFile("demo-repo/src/controllers/upload.controller.js", "export async function handleUploadPost() {}"),
    ], "demo-repo");

    expect(snapshot.fileTree.some((entry) => entry.path === "src/app/api/upload/route.js")).toBe(true);
    expect(snapshot.textFiles.some((entry) => entry.path === "src/controllers/upload.controller.js")).toBe(true);
  });

  it("scopes snapshot text files to the selected deep-index paths", async () => {
    const snapshot = await createFolderUploadSnapshot([
      createMockFile("demo-repo/src/app/api/upload/route.js", "export async function POST() {}"),
      createMockFile("demo-repo/src/controllers/upload.controller.js", "export async function handleUploadPost() {}"),
      createMockFile("demo-repo/src/lib/repository-snapshot.js", "export function createUploadSnapshot() {}"),
    ], "demo-repo");

    const scoped = scopeSnapshotToPaths(snapshot, [
      { path: "src/app/api/upload/route.js" },
      { path: "src/controllers/upload.controller.js" },
    ]);

    expect(scoped.fileTree).toHaveLength(2);
    expect(scoped.textFiles).toHaveLength(2);
    expect(scoped.textFiles.some((entry) => entry.path === "src/lib/repository-snapshot.js")).toBe(false);
  });
});
