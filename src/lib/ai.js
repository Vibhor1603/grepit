export async function analyzeCodebase(repoUrl, githubAccessToken = null) {
  console.log(`[AI Service] Starting analysis for ${repoUrl}`);

  try {
    const startTime = Date.now();
    let owner, repo;

    try {
      const url = new URL(repoUrl);
      const parts = url.pathname.split('/').filter(Boolean);
      owner = parts[0];
      repo = parts[1];
    } catch (e) {
      throw new Error("Invalid GitHub URL");
    }

    if (!owner || !repo) {
      throw new Error("Could not parse owner/repo from URL");
    }

    // 1. Fetch Repository Structure using GitHub API
    const headers = { 'User-Agent': 'CodeLens-App' };
    if (githubAccessToken) {
      headers['Authorization'] = `token ${githubAccessToken}`;
    }

    // Try to get default branch first
    let defaultBranch = 'main';
    try {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (repoRes.ok) {
        const repoData = await repoRes.json();
        defaultBranch = repoData.default_branch || 'main';
      }
    } catch(e) { console.error("Error fetching repo info", e); }

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
    
    if (!treeRes.ok) {
        const errorText = await treeRes.text();
        throw new Error(`GitHub API Error: ${treeRes.status} ${errorText}`);
    }

    const treeData = await treeRes.json();
    const tree = treeData.tree || [];

    const files = tree.filter(t => t.type === 'blob').map(t => t.path);
    const totalFiles = files.length;
    
    // truncate files if too large for context
    const popularFiles = files.slice(0, 1000).join('\\n');

    // 2. Prepare Prompt for Groq
    const prompt = `
You are a senior software architect analyzing a codebase.
Here is the file structure (up to 1000 files) of a GitHub repository:
${popularFiles}

Based on this file structure, analyze the repository architecture and infer the tech stack, major directories, and likely endpoints if it's an API/web app.

You must respond ONLY with a valid JSON object following exactly this schema:
{
  "healthScore": <integer out of 100 based on structure cleanliness>,
  "directories": [
    { "name": "<folder path>", "description": "<what this folder likely does>" }
  ],
  "techStack": ["<tech1>", "<tech2>"],
  "endpoints": [
    { "method": "GET|POST|PUT|DELETE", "path": "<likely endpoint path>", "desc": "<description>", "auth": <boolean> }
  ]
}
`;

    // 3. Send to Groq API
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192", // Groq supported model
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!groqRes.ok) {
       const err = await groqRes.text();
       throw new Error(`Groq API Error: ${groqRes.status} ${err}`);
    }

    const groqData = await groqRes.json();
    const resultJsonStr = groqData.choices[0]?.message?.content || "{}";
    const result = JSON.parse(resultJsonStr);

    const timing = ((Date.now() - startTime) / 1000).toFixed(1);

    return {
      healthScore: result.healthScore || 85,
      totalFiles: totalFiles,
      analysisTimeLabel: `${timing}s`,
      directories: result.directories || [],
      techStack: result.techStack || [],
      endpoints: result.endpoints || []
    };

  } catch (error) {
    console.error("[AI Service Error]", error);
    throw error;
  }
}
