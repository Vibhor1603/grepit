"use client";

function humanJoin(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function looksGenericSummary(summary = "") {
  return !summary || /looks like a|tracked files|detected languages|software project/i.test(summary);
}

function inferProductNarrative(analysis, arch) {
  const filePaths = (analysis?.file_tree || [])
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path.toLowerCase());
  const techStack = (arch.techStack || []).slice(0, 4);
  const stackSentence = techStack.length > 0 ? ` It appears to be built with ${humanJoin(techStack)}.` : "";

  const hasCodeAnalysisFlow = filePaths.some((path) => /analyz|code-intel|flow|architecture|query|report/.test(path));
  const hasDashboard = filePaths.some((path) => /dashboard|components\/views|querywidget/.test(path));
  const hasImportFlow = filePaths.some((path) => /upload|github|auth|snapshot/.test(path));
  const hasApi = (arch.apiEndpoints || []).length > 0;

  if (hasCodeAnalysisFlow && hasDashboard) {
    return `This repository looks like a web application that imports repositories or uploaded source code, analyzes the codebase, and presents the results in an interactive dashboard.${stackSentence}`;
  }

  if (hasImportFlow && hasApi) {
    return `This codebase appears to be a full-stack product that accepts external input, processes it on the backend, and exposes the results through a browser-based interface.${stackSentence}`;
  }

  if ((arch.components || []).length > 0 && hasApi) {
    return `This repository appears to be a full-stack web application with both a frontend experience and backend API behavior.${stackSentence}`;
  }

  if ((arch.components || []).length > 0) {
    return `This repository appears to be a frontend application focused on reusable UI components and client-side flows.${stackSentence}`;
  }

  if (hasApi) {
    return `This repository appears to be a backend-oriented service with API routes, supporting logic, and data access layers.${stackSentence}`;
  }

  return looksGenericSummary(analysis?.summary)
    ? `This repository is a ${String(arch.projectType || "software project").toLowerCase()} organized into source files, configuration, and supporting modules.${stackSentence}`
    : analysis.summary;
}

function buildCapabilityBullets(analysis, arch) {
  const filePaths = (analysis?.file_tree || [])
    .filter((entry) => entry.type === "blob")
    .map((entry) => entry.path.toLowerCase());
  const bullets = [];

  if (filePaths.some((path) => /auth|nextauth|github/.test(path))) {
    bullets.push("Supports authenticated access, which can be used to work with private repositories or user-specific data.");
  }
  if (filePaths.some((path) => /analyz|code-intel|architecture|flow/.test(path))) {
    bullets.push("Inspects repository structure and code files to extract architecture, symbols, flows, and quality signals.");
  }
  if (filePaths.some((path) => /query|groq|ai/.test(path))) {
    bullets.push("Includes an AI-assisted explanation layer so users can ask questions about the analyzed codebase.");
  }
  if ((arch.apiEndpoints || []).length > 0) {
    bullets.push(`Exposes ${(arch.apiEndpoints || []).length} detected API route${arch.apiEndpoints.length === 1 ? "" : "s"} to handle app behavior or analysis actions.`);
  }
  if ((arch.components || []).length > 0) {
    bullets.push(`Uses reusable UI components to render the interface and present the analysis visually.`);
  }
  if (filePaths.some((path) => /report|pdf/.test(path))) {
    bullets.push("Includes report-oriented flows for packaging and sharing analysis output.");
  }

  if (bullets.length === 0) {
    bullets.push("Organizes source files into modules so the main logic, setup, and supporting utilities are easier to explore.");
  }

  return bullets.slice(0, 5);
}

export default function Overview({ analysis, theme, eli5, onNavigate }) {
  const d = theme === "dark";

  if (!analysis) {
    return (
      <div className={`text-center py-20 text-sm font-mono ${d ? "text-d-subtle" : "text-ink-faint"}`}>
        No analysis found. <a href="/" className="underline">← Go back</a>
      </div>
    );
  }

  const arch = analysis?.architecture || analysis?.results || {};
  const techStack = arch.techStack || [];
  const entryPoints = arch.entryPoints || [];
  const keyFolders = arch.keyFolders || [];
  const importantFiles = arch.importantFiles || [];
  const quickLinks = [
    { label: "Open source files", tab: "files", description: "Browse the code and inspect real file contents." },
    (analysis?.results?.symbolIndex || []).length > 0 ? { label: "Inspect symbols", tab: "symbols", description: "See functions, classes, methods, and usage." } : null,
    (arch.apiEndpoints || []).length > 0 ? { label: "Review API routes", tab: "api", description: "Check handlers plus request and response shapes." } : null,
    (arch.components || []).length > 0 ? { label: "View UI components", tab: "components", description: "Follow props, rendered children, and usage sites." } : null,
    { label: "Check quality risks", tab: "security", description: "Look at security findings, duplication, and testing gaps." },
  ].filter(Boolean);
  const productNarrative = arch.userFacingPurpose || inferProductNarrative(analysis, arch);
  const capabilityBullets = (arch.mainCapabilities && arch.mainCapabilities.length > 0)
    ? arch.mainCapabilities
    : buildCapabilityBullets(analysis, arch);
  const readableStartPoints = [
    ...entryPoints.slice(0, 2).map((path) => ({
      label: path,
      hint: "Entry point",
      action: () => onNavigate?.("files", { path }),
    })),
    ...importantFiles.slice(0, 3).map((path) => ({
      label: path,
      hint: "Important file",
      action: () => onNavigate?.("files", { path }),
    })),
    ...keyFolders.slice(0, 3).map((folder) => ({
      label: folder.name,
      hint: folder.purpose || "Key folder",
      action: () => onNavigate?.("files", { path: folder.name }),
    })),
  ].slice(0, 6);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.7fr)_360px] gap-6 items-start">
      <div className="space-y-5">
        <section className={`card-brutal rounded-none p-6 ${d ? "bg-d-card" : "bg-white"}`}>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <h2 className="text-2xl font-black tracking-tight">What This Codebase Does</h2>
            {arch.projectType && (
              <span className={`px-2.5 py-1 text-[11px] font-mono border-2 font-bold ${d ? "border-white bg-lime text-ink" : "border-black bg-lime text-ink"}`}>
                {arch.projectType}
              </span>
            )}
          </div>
          <p className={`text-[15px] leading-8 ${d ? "text-d-muted" : "text-ink-muted"}`}>
            {eli5 ? `${analysis.repo_name} is a software project with different parts that work together. ${productNarrative}` : productNarrative}
          </p>
          <ul className="mt-5 space-y-2.5">
            {capabilityBullets.map((point) => (
              <li key={point} className={`text-[14px] leading-7 flex items-start gap-3 ${d ? "text-d-muted" : "text-ink-muted"}`}>
                <span className="mt-1.5 text-blue">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`card-brutal rounded-none p-6 ${d ? "bg-blue/12" : "bg-white"}`}>
          <h3 className="text-xl font-black tracking-tight mb-4">Where To Go Next</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {quickLinks.map((item) => (
              <button
                key={item.tab}
                onClick={() => onNavigate?.(item.tab)}
                className={`text-left border-2 p-4 rounded-none transition-all ${d ? "border-white bg-d-bg hover:bg-blue/12" : "border-black bg-cream hover:bg-sand"}`}
              >
                <div className="text-sm font-black">{item.label}</div>
                <div className={`text-[12px] mt-2 leading-6 ${d ? "text-d-muted" : "text-ink-muted"}`}>{item.description}</div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-5">
        <section className={`card-brutal rounded-none p-5 ${d ? "bg-purple/12" : "bg-white"}`}>
          <div className={`text-[10px] font-mono uppercase tracking-[0.22em] mb-3 ${d ? "text-d-subtle" : "text-ink-faint"}`}>At A Glance</div>
          <div className="space-y-3">
            {[
              { label: "Repository", value: analysis.repo_name || "Unknown" },
              { label: "Source", value: analysis.source === "github" ? "GitHub import" : "Uploaded files" },
              { label: "Main stack", value: techStack.length > 0 ? humanJoin(techStack.slice(0, 3)) : "Not inferred yet" },
            ].map((item) => (
              <div key={item.label}>
                <div className={`text-[10px] font-mono uppercase tracking-[0.16em] mb-1 ${d ? "text-d-subtle" : "text-ink-faint"}`}>{item.label}</div>
                <div className={`text-[14px] leading-7 ${d ? "text-d-text" : "text-ink"}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={`card-brutal rounded-none p-5 ${d ? "bg-lime/12" : "bg-white"}`}>
          <div className={`text-[10px] font-mono uppercase tracking-[0.22em] mb-3 ${d ? "text-d-subtle" : "text-ink-faint"}`}>Start Reading Here</div>
          <div className="space-y-2">
            {readableStartPoints.length > 0 ? readableStartPoints.map((item) => (
              <button
                key={`${item.hint}-${item.label}`}
                onClick={item.action}
                className={`w-full text-left border-2 rounded-none p-3 transition-all ${d ? "border-white bg-d-bg hover:bg-lime/12" : "border-black bg-cream hover:bg-sand"}`}
              >
                <div className="text-[13px] font-mono font-bold break-all">{item.label}</div>
                <div className={`text-[11px] mt-1 ${d ? "text-d-subtle" : "text-ink-faint"}`}>{item.hint}</div>
              </button>
            )) : (
              <p className={`text-sm ${d ? "text-d-subtle" : "text-ink-faint"}`}>No strong entry files were inferred yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
