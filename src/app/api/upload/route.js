import { createServerSupabase } from '../../../lib/supabase';
import { rateLimit } from '../../../lib/rateLimit';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || 'unknown';
  const limit = rateLimit(`upload:${ip}`, 5, 60000);
  if (!limit.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!file.name.endsWith('.zip')) return NextResponse.json({ error: 'Only .zip files supported' }, { status: 400 });
    if (file.size > 50 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });

    const supabase = createServerSupabase();
    const repoName = file.name.replace('.zip', '');

    // Read zip as buffer and extract file listing
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Simple zip file listing by parsing central directory
    // For a real implementation, use a library like 'jszip'
    const fileTree = [];
    const textDecoder = new TextDecoder();
    let offset = 0;
    
    // Look for local file headers (PK\x03\x04)
    while (offset < buffer.length - 4) {
      if (buffer[offset] === 0x50 && buffer[offset + 1] === 0x4B && buffer[offset + 2] === 0x03 && buffer[offset + 3] === 0x04) {
        const fnameLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);
        const compSize = buffer.readUInt32LE(offset + 18);
        const fname = textDecoder.decode(buffer.slice(offset + 30, offset + 30 + fnameLen));
        
        if (!fname.endsWith('/') && !fname.startsWith('__MACOSX') && !fname.startsWith('.')) {
          fileTree.push({ path: fname, type: 'blob', size: compSize });
        }
        
        offset += 30 + fnameLen + extraLen + compSize;
      } else {
        offset++;
      }
    }

    // Detect languages from extensions
    const extMap = { '.js': 'JavaScript', '.ts': 'TypeScript', '.jsx': 'JavaScript', '.tsx': 'TypeScript', '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.java': 'Java', '.rb': 'Ruby', '.css': 'CSS', '.html': 'HTML', '.json': 'JSON', '.md': 'Markdown' };
    const languages = {};
    fileTree.forEach(f => {
      const ext = '.' + f.path.split('.').pop();
      const lang = extMap[ext];
      if (lang) languages[lang] = (languages[lang] || 0) + (f.size || 100);
    });

    const { data: analysis, error: insertError } = await supabase
      .from('analyses').insert({
        repo_url: `local://${repoName}`,
        repo_name: repoName,
        status: 'COMPLETED',
        file_tree: fileTree.slice(0, 5000),
        total_files: fileTree.length,
        total_lines: Math.round(fileTree.reduce((s, f) => s + (f.size || 0), 0) / 40),
        languages,
        summary: `Local project "${repoName}" with ${fileTree.length} files across ${Object.keys(languages).length} languages.`,
        architecture: {},
        results: {},
      }).select().single();

    if (insertError) throw insertError;

    // Trigger AI analysis in background (non-blocking)
    fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/analyze-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysisId: analysis.id, fileTree: fileTree.slice(0, 200).map(f => f.path), languages, repoName })
    }).catch(() => {}); // Fire and forget

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
