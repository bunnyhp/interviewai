export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const { question, systemPrompt } = await req.json();

    if (!question || !systemPrompt) {
      return new Response(JSON.stringify({ error: 'Missing question or systemPrompt' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use Gemini 2.0 Flash via the Google AI Generative Language API with streaming
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nINTERVIEW QUESTION:\n${question}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: 'Gemini API error', details: errorText }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Transform Gemini SSE stream to match OpenAI format so the client can parse it the same way
    const reader = response.body?.getReader();
    if (!reader) {
      return new Response(JSON.stringify({ error: 'No response body' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (!data) continue;

                try {
                  const parsed = JSON.parse(data);
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                  if (text) {
                    // Reformat as OpenAI-compatible SSE
                    const openaiFormat = {
                      choices: [{ delta: { content: text } }],
                    };
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify(openaiFormat)}\n\n`)
                    );
                  }
                } catch {
                  // Skip malformed chunks
                }
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
