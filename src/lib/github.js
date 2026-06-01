import * as Sentry from "@sentry/nextjs";

const GITHUB_REPO_REGEX = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git|\/)?$/i;

export function normalizeGitHubRepoUrl(input) {
  if (typeof input !== "string") {
    throw new Error("Repository URL is required.");
  }

  const trimmed = input.trim();
  const match = trimmed.match(GITHUB_REPO_REGEX);

  if (!match) {
    throw new Error("Enter a valid GitHub URL like https://github.com/owner/repository.");
  }

  return {
    owner: match[1],
    repo: match[2],
    repoPath: `${match[1]}/${match[2]}`,
    repoUrl: `https://github.com/${match[1]}/${match[2]}`,
  };
}

export async function githubRequest(pathname, accessToken) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "grepit-Code-Analyst",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`https://api.github.com${pathname}`, {
    headers,
    cache: "no-store",
  });

  return response;
}

export async function fetchGitHubRepository(repoPath, accessToken) {
  const repoResponse = await githubRequest(`/repos/${repoPath}`, accessToken);

  if (repoResponse.status === 404) {
    if (!accessToken) {
      const error = new Error("Repository not found or it may be private.");
      error.code = "AUTH_REQUIRED";
      throw error;
    }
    throw new Error("Repository not found.");
  }

  if (repoResponse.status === 401) {
    const error = new Error("GitHub access token is invalid or expired.");
    error.code = "TOKEN_INVALID";
    Sentry.captureException(error, {
      level: "warning",
      tags: { source: "github", reason: "auth_failure" },
      extra: { repoPath, status: 401 },
    });
    throw error;
  }

  if (repoResponse.status === 403 && !accessToken) {
    const error = new Error("GitHub authentication is required for this repository.");
    error.code = "AUTH_REQUIRED";
    throw error;
  }

  if (repoResponse.status === 403 && accessToken) {
    const rateLimitRemaining = repoResponse.headers.get("x-ratelimit-remaining");
    if (rateLimitRemaining === "0") {
      const error = new Error("GitHub API rate limit exceeded. Try again later.");
      Sentry.captureException(error, {
        level: "warning",
        tags: { source: "github", reason: "rate_limit" },
        extra: { repoPath, rateLimitRemaining },
      });
      throw error;
    }
    const error = new Error("Access forbidden. The token may not have sufficient permissions.");
    error.code = "TOKEN_INVALID";
    Sentry.captureException(error, {
      level: "warning",
      tags: { source: "github", reason: "auth_failure" },
      extra: { repoPath, status: 403 },
    });
    throw error;
  }

  if (!repoResponse.ok) {
    throw new Error(`GitHub API error (${repoResponse.status}).`);
  }

  const repoData = await repoResponse.json();
  const defaultBranch = repoData.default_branch || "main";

  const [languagesResponse, treeResponse] = await Promise.all([
    githubRequest(`/repos/${repoPath}/languages`, accessToken),
    githubRequest(`/repos/${repoPath}/git/trees/${defaultBranch}?recursive=1`, accessToken),
  ]);

  const languages = languagesResponse.ok ? await languagesResponse.json() : {};
  const treePayload = treeResponse.ok ? await treeResponse.json() : { tree: [] };
  const fileTree = (treePayload.tree || []).map((entry) => ({
    path: entry.path,
    type: entry.type,
    size: entry.size || 0,
  }));

  return {
    repoData,
    languages,
    fileTree,
    defaultBranch,
  };
}

export async function fetchGitHubFileText(repoPath, ref, filePath, accessToken) {
  const response = await githubRequest(
    `/repos/${repoPath}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}?ref=${encodeURIComponent(ref)}`,
    accessToken,
  );

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();

  if (payload?.content) {
    const normalized = payload.content.replace(/\n/g, "");
    return Buffer.from(normalized, "base64").toString("utf8");
  }

  // GitHub returns download_url for files larger than ~1 MB via the contents API.
  if (payload?.download_url) {
    try {
      const headers = { "User-Agent": "grepit-Code-Analyst" };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const dl = await fetch(payload.download_url, { headers, cache: "no-store" });
      if (dl.ok) return await dl.text();
    } catch {
      return null;
    }
  }

  return null;
}
