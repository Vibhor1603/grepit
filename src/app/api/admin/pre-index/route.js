/**
 * Admin endpoint to pre-index suggested repositories.
 * 
 * POST /api/admin/pre-index
 * 
 * This triggers analysis for all suggested repos from the landing config.
 * Results are stored with owner_email = NULL so they're shared/public.
 * When any user clicks a suggested repo, they get an instant clone.
 * 
 * Protected by a secret key — only callable with the correct ADMIN_SECRET.
 */

import { NextResponse } from "next/server";
import { SITE_CONFIG } from "../../../../lib/landing-config";
import { normalizeGitHubRepoUrl } from "../../../../lib/github";
import { createGitHubSnapshot } from "../../../../lib/repository-snapshot";
import { buildRepositoryAnalysis, maybeEnhanceAnalysisWithGroq, mergeAnalysisDetails } from "../../../../lib/analysis";
import { buildCodeIntelligence } from "../../../../lib/code-intel";
import { buildCodebaseIndex, buildTraversalArchitecture } from "../../../../lib/codebase-index";
import { createAnalysisRecord, findLatestAnalysisByRepo, updateAnalysisRecord } from "../../../../lib/analysis-store";
import { enrichGitHubComponents, buildFlowMap, mergeApiEndpoints } from "../../../../controllers/analyze.controller";

export const maxDuration = 300; // 5 minutes (Vercel Pro plan)

export async function POST(request) {
  // Auth check — require admin secret
  const { secret } = await request.json().catch(() => ({}));
  const adminSecret = process.env.ADMIN_SECRET;
  
  if (!adminSecret || secret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suggestedRepos = SITE_CONFIG.hero.suggestedRepos;
  const results = [];

  for (const repoShort of suggestedRepos) {
    const repoUrl = `https://github.com/${repoShort}`;
    const repoName = repoShort.split('/')[1];

    try {
      // Check if already pre-indexed
      const existing = await findLatestAnalysisByRepo(repoUrl, null).catch(() => null);
      if (existing && existing.status === 'COMPLETED') {
        results.push({ repo: repoShort, status: 'already_indexed', id: existing.id });
        continue;
      }

      const normalized = normalizeGitHubRepoUrl(repoUrl);
      
      // Create record
      const analysis = await createAnalysisRecord({
        repo_url: normalized.repoUrl,
        repo_name: repoName,
        status: "PROCESSING",
        source: "github",
        owner_email: null, // Public/shared — this is the key part
      });

      // Fetch snapshot (no auth token needed for public repos)
      const snapshot = await createGitHubSnapshot(normalized.repoPath, null);
      const fileCount = snapshot.fileTree.length;

      // Filter tree
      const filteredTree = snapshot.fileTree.filter(f => {
        const p = f.path.toLowerCase();
        return !p.includes('node_modules/') && !p.includes('.git/') &&
               !p.includes('vendor/') && !p.includes('dist/') &&
               !p.includes('build/') && !p.includes('.next/') &&
               !p.includes('__pycache__/') && !p.includes('.cache/');
      }).slice(0, 5000);

      // Build base analysis
      let result = buildRepositoryAnalysis({
        repoUrl: snapshot.repoUrl,
        repoName: repoName,
        fileTree: filteredTree,
        languages: snapshot.languages,
        repoData: snapshot.repoData,
        source: "github",
      });

      // Component enrichment (only for small repos)
      let detailedComponents = [];
      if (fileCount <= 500) {
        detailedComponents = await enrichGitHubComponents(snapshot, normalized.repoPath, null);
      }

      // Code intelligence
      const codeIntel = buildCodeIntelligence(snapshot, null);

      // Codebase index
      const codebaseIndex = buildCodebaseIndex({
        fileTree: filteredTree,
        files: codeIntel.files,
        symbolIndex: codeIntel.symbolIndex,
        dependencyGraph: codeIntel.dependencyGraph,
        callGraph: codeIntel.callGraph,
      });
      const persistedCodebaseIndex = { ...codebaseIndex };
      delete persistedCodebaseIndex.__runtime;

      const mergedEndpoints = mergeApiEndpoints(result.architecture.apiEndpoints, codeIntel.files);

      result = mergeAnalysisDetails(result, {
        components: detailedComponents.length ? detailedComponents : result.architecture.components,
        flowPaths: buildFlowMap(result.architecture.flowPaths, detailedComponents, mergedEndpoints),
        apiEndpoints: mergedEndpoints,
        symbolIndex: codeIntel.symbolIndex,
        files: codeIntel.files,
        rawDependencyGraph: codeIntel.dependencyGraph,
        dependencyGraph: codebaseIndex.dependencyGraph,
        callGraph: codeIntel.callGraph,
        fileCallGraph: codebaseIndex.fileCallGraph,
        codebaseIndex: persistedCodebaseIndex,
        queryArchitecture: buildTraversalArchitecture(persistedCodebaseIndex),
        testing: codeIntel.testing,
        reports: codeIntel.reports,
        quality: codeIntel.quality,
        security: codeIntel.security,
        performance: codeIntel.performance,
        incremental: codeIntel.incremental,
      });

      // AI enhancement
      result = await maybeEnhanceAnalysisWithGroq(result, { snapshot, codeIntel }).catch(() => result);

      // Save
      const updated = await updateAnalysisRecord(analysis.id, {
        status: "COMPLETED",
        repo_url: result.repoUrl,
        repo_name: result.repoName,
        summary: result.summary,
        total_files: result.totalFiles,
        total_lines: result.totalLines,
        languages: result.languages,
        file_tree: result.fileTree,
        architecture: result.architecture,
        results: result.results,
        is_private: false,
        owner_email: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      });

      results.push({ repo: repoShort, status: 'indexed', id: updated.id, files: result.totalFiles });
    } catch (err) {
      results.push({ repo: repoShort, status: 'failed', error: err.message });
    }
  }

  return NextResponse.json({ results });
}
