import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { rateLimit, rateLimitKey } from "../../../lib/rateLimit";
import { getAnalysisRecord } from "../../../lib/analysis-store";
import { getCurrentSession, getSessionOwner } from "../../../lib/server-session";

function buildMarkdownReport(analysis) {
  const arch = analysis?.architecture || {};
  return [
    `# ${analysis.repo_name} Analysis Report`,
    "",
    `Source: ${analysis.repo_url}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Overview",
    analysis.summary || "No summary available.",
    "",
    "## Tech Stack",
    ...(arch.techStack || []).map(i => `- ${i}`),
    "",
    "## Entry Points",
    ...(arch.entryPoints || []).map(i => `- ${i}`),
    "",
    "## Key Folders",
    ...(arch.keyFolders || []).map(i => `- **${i.name}**: ${i.purpose}`),
    "",
    "## Security Issues",
    ...(arch.securityIssues || []).map(i => `- [${i.severity?.toUpperCase()}] **${i.title}**: ${i.description}`),
    "",
    "## Suggestions",
    ...(arch.suggestions || []).map(i => `- ${i}`),
  ].join("\n");
}

export async function GET(request) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

  const session = await getCurrentSession();
  const ownerEmail = getSessionOwner(session);

  const rlKey = rateLimitKey("report", ip, ownerEmail);
  const limit = rateLimit(rlKey, 10, 60_000);
  if (!limit.success) return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });

  try {
    const url    = new URL(request.url);
    const id     = url.searchParams.get("id");
    const format = url.searchParams.get("format") || "markdown";

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const analysis = await getAnalysisRecord(id);
    if (!analysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    if (analysis.owner_email && analysis.owner_email !== ownerEmail) {
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
    console.error("[report] error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
