import { NextResponse } from "next/server";
import { getAnalysisRecord } from "../../../lib/analysis-store";
import { getCurrentSession, getSessionOwner } from "../../../lib/server-session";

function buildMarkdownReport(analysis) {
  const arch = analysis?.architecture || {};
  const report = [
    `# ${analysis.repo_name} Analysis Report`,
    "",
    `Source: ${analysis.repo_url}`,
    "",
    "## Overview",
    analysis.summary || "No summary available.",
    "",
    "## Tech Stack",
    ...(arch.techStack || []).map((item) => `- ${item}`),
    "",
    "## Entry Points",
    ...(arch.entryPoints || []).map((item) => `- ${item}`),
    "",
    "## Key Folders",
    ...(arch.keyFolders || []).map((item) => `- ${item.name}: ${item.purpose}`),
    "",
    "## Security",
    ...(arch.securityIssues || []).map((item) => `- [${item.severity}] ${item.title}: ${item.description}`),
    "",
    "## Suggestions",
    ...(arch.suggestions || []).map((item) => `- ${item}`),
  ];
  return report.join("\n");
}

export async function GET(request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    const format = new URL(request.url).searchParams.get("format") || "markdown";
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const session = await getCurrentSession();
    const ownerEmail = getSessionOwner(session);
    const analysis = await getAnalysisRecord(id);
    if (analysis?.owner_email && analysis.owner_email !== ownerEmail) {
      return NextResponse.json({ error: "You do not have access to this report." }, { status: 403 });
    }

    const markdown = buildMarkdownReport(analysis);
    if (format === "json") {
      return NextResponse.json({ markdown, shareToken: analysis?.results?.reports?.shareToken || null });
    }

    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `inline; filename="${analysis.repo_name || "analysis"}.md"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
