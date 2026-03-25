import { createServerSupabase } from '../../../lib/supabase';
import { rateLimit } from '../../../lib/rateLimit';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function POST(request) {
  const supabase = createServerSupabase();
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

  // Rate limit: 5 AI queries per minute
  const limit = rateLimit(`query:${ip}`, 5, 60000);
  if (!limit.success) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(limit.resetIn / 1000)}s.`, remaining: 0 },
      { status: 429 }
    );
  }

  try {
    const { query, analysisId } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (query.length > 2000) {
      return NextResponse.json({ error: 'Query too long (max 2000 characters)' }, { status: 400 });
    }

    // Build context
    let context = '';
    if (analysisId) {
      const { data: analysis } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (analysis) {
        context = `Repository: ${analysis.repo_name}
Summary: ${analysis.summary}
Languages: ${JSON.stringify(analysis.languages)}
Architecture: ${JSON.stringify(analysis.architecture)}
File tree (first 80): ${JSON.stringify((analysis.file_tree || []).slice(0, 80).map(f => f.path))}`;
      }
    }

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are a expert code architect analyzing a codebase. Be concise and technical. Use markdown.${context ? `\n\nCodebase Context:\n${context}` : ''}`
          },
          { role: 'user', content: query }
        ],
        temperature: 0.3,
        max_tokens: 1200
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq error:', errText);
      throw new Error('AI service temporarily unavailable');
    }

    const groqData = await groqRes.json();
    const response = groqData.choices?.[0]?.message?.content || 'No response generated.';

    // Save to history
    await supabase.from('query_history').insert({
      analysis_id: analysisId || null,
      query,
      response,
    });

    return NextResponse.json({ response, remaining: limit.remaining });
  } catch (error) {
    console.error('Query error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
