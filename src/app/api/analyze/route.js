import { createServerSupabase } from '../../../lib/supabase';
import { rateLimit } from '../../../lib/rateLimit';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request) {
  const supabase = createServerSupabase();
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';
  const limit = rateLimit(`analyze:${ip}`, 10, 60000);
  if (!limit.success) return NextResponse.json({ error: 'Rate limit exceeded. Try again shortly.', resetIn: limit.resetIn }, { status: 429 });

  try {
    const body = await request.json();
    const { repoUrl, repoName, accessToken } = body;
    if (!repoUrl) return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
    const repoMatch = repoUrl.match(/github\.com\/([\w.-]+)\/([\w.-]+)/);
    if (!repoMatch) return NextResponse.json({ error: 'Invalid GitHub repository URL' }, { status: 400 });
    const repoPath = `${repoMatch[1]}/${repoMatch[2]}`;

    // Create analysis
    const { data: analysis, error: insertError } = await supabase
      .from('analyses').insert({ repo_url: repoUrl, repo_name: repoName || repoMatch[2], status: 'PROCESSING' }).select().single();
    if (insertError) throw insertError;

    const ghHeaders = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'Vibo-Analyzer' };
    if (accessToken) ghHeaders['Authorization'] = `Bearer ${accessToken}`;

    let repoData = {}, fileTree = [], languages = {};

    // Fetch repo
    const repoRes = await fetch(`https://api.github.com/repos/${repoPath}`, { headers: ghHeaders });
    if (repoRes.status === 404 || repoRes.status === 403) {
      if (!accessToken) { await supabase.from('analyses').delete().eq('id', analysis.id); return NextResponse.json({ error: 'Private repo — sign in with GitHub first.', requiresAuth: true }, { status: 403 }); }
      throw new Error('Repository not found or access denied.');
    }
    if (repoRes.ok) repoData = await repoRes.json();

    // Fetch languages & tree
    const [langRes, treeRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repoPath}/languages`, { headers: ghHeaders }),
      fetch(`https://api.github.com/repos/${repoPath}/git/trees/${repoData.default_branch || 'main'}?recursive=1`, { headers: ghHeaders })
    ]);
    if (langRes.ok) languages = await langRes.json();
    if (treeRes.ok) { const d = await treeRes.json(); fileTree = (d.tree || []).map(f => ({ path: f.path, type: f.type, size: f.size || 0 })); }

    const totalFiles = fileTree.filter(f => f.type === 'blob').length;
    const totalSize = fileTree.reduce((s, f) => s + (f.size || 0), 0);

    // Enhanced AI Analysis — single comprehensive prompt
    let aiResult = {};
    try {
      const filePaths = fileTree.slice(0, 200).map(f => f.path);
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: `You are a senior software architect and security expert. Analyze the repository and return comprehensive JSON with these fields:
- summary: string (2-3 sentences about the project)
- projectType: string (e.g., "Web Application", "CLI Tool", "Library")
- techStack: string[] (frameworks, languages, tools detected)
- patterns: string[] (design patterns found)
- layers: {name: string, modules: string[]}[] (architecture layers)
- dependencies: {from: string, to: string}[] (module dependencies)
- suggestions: string[] (improvement suggestions)
- apiEndpoints: {method: string, path: string, file: string, description: string}[] (detected API routes)
- components: {name: string, file: string, props: string[], children: string[]}[] (UI components)
- securityIssues: {severity: "high"|"medium"|"low", title: string, description: string, file: string}[] (security findings)
- setupSteps: string[] (local development setup instructions)
- codeSmells: {file: string, issue: string, suggestion: string}[] (code quality issues)
- testGaps: string[] (files/modules lacking tests)
- flowPaths: {name: string, steps: string[]}[] (key execution flows)
- mlInsights: {models: string[], pipelines: string[], dataFiles: string[]} (ML/data related findings)
Be concise and specific. Use actual file paths from the list.` },
            { role: 'user', content: `Repo: ${repoPath}\nDescription: ${repoData.description || 'N/A'}\nStars: ${repoData.stargazers_count || 0}\nLanguages: ${JSON.stringify(languages)}\nFiles: ${JSON.stringify(filePaths)}` }
          ],
          temperature: 0.15, max_tokens: 3000, response_format: { type: 'json_object' }
        })
      });
      if (groqRes.ok) {
        const d = await groqRes.json();
        aiResult = JSON.parse(d.choices?.[0]?.message?.content || '{}');
      }
    } catch (err) { console.error('Groq error:', err.message); }

    const { data: updated } = await supabase
      .from('analyses').update({
        status: 'COMPLETED',
        file_tree: fileTree.slice(0, 5000),
        architecture: aiResult,
        summary: aiResult.summary || `${repoPath}: ${totalFiles} files, ${Object.keys(languages).length} languages.`,
        total_files: totalFiles,
        total_lines: Math.round(totalSize / 40),
        languages,
        results: { repoData: { description: repoData.description, stars: repoData.stargazers_count, forks: repoData.forks_count }, ...aiResult },
        updated_at: new Date().toISOString()
      }).eq('id', analysis.id).select().single();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: error.message || 'Analysis failed' }, { status: 500 });
  }
}

export async function GET(request) {
  const supabase = createServerSupabase();
  const id = new URL(request.url).searchParams.get('id');
  try {
    if (id) {
      const { data, error } = await supabase.from('analyses').select('*').eq('id', id).single();
      if (error) throw error;
      return NextResponse.json(data);
    }
    const { data, error } = await supabase.from('analyses').select('*').order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
