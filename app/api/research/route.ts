import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { companyName } = await req.json();

    if (!companyName) {
      return NextResponse.json({ error: 'Missing companyName' }, { status: 400 });
    }

    const tavilyKey = process.env.TAVILY_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let snippets = '';

    // Step 1: Search via Tavily
    if (tavilyKey) {
      try {
        const searchResponse = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${companyName} company overview mission culture`,
            max_results: 5,
            search_depth: 'basic',
          }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const results = searchData.results || [];
          snippets = results
            .map((r: { title?: string; content?: string }) => `${r.title || ''}: ${r.content || ''}`)
            .join('\n\n');
        }
      } catch {
        // Tavily failed — continue without search results
      }
    }

    // Step 2: Summarize with GPT-4o
    if (!openaiKey) {
      return NextResponse.json({
        summary: `${companyName} — Company research unavailable (OpenAI API key not configured).`,
      });
    }

    const prompt = snippets
      ? `Summarize the following information about ${companyName} in exactly 300 words for a job candidate preparing for an interview. Include the company's mission, products, culture, recent developments, and what makes them unique:\n\n${snippets}`
      : `Write a 300-word overview of ${companyName} for a job candidate preparing for an interview. Include the company's mission, products, culture, and what makes them unique. Use your general knowledge.`;

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 500,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful research assistant. Provide factual, concise company overviews for job candidates.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!gptResponse.ok) {
      return NextResponse.json({
        summary: `${companyName} — Company research unavailable.`,
      });
    }

    const gptData = await gptResponse.json();
    const summary = gptData.choices?.[0]?.message?.content || `${companyName} — No summary generated.`;

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json(
      { summary: 'Company research unavailable.' },
      { status: 200 }
    );
  }
}
