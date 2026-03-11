import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { question, systemPrompt } = await req.json();

    if (!question || !systemPrompt) {
      return NextResponse.json({ error: 'Missing question or systemPrompt' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
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
      console.error('Gemini API error:', response.status, errorText);

      // If Gemini fails, try a non-streaming fallback
      return await handleNonStreaming(apiKey, question, systemPrompt);
    }

    // Transform Gemini SSE stream to match OpenAI format so the client can parse it the same way
    const geminiBody = response.body;
    if (!geminiBody) {
      return await handleNonStreaming(apiKey, question, systemPrompt);
    }

    const reader = geminiBody.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            // Keep the last potentially incomplete line in buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data: ')) {
                const data = trimmedLine.slice(6).trim();
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
        } catch (e) {
          console.error('Stream processing error:', e);
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
  } catch (e) {
    console.error('Gemini route error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Non-streaming fallback if SSE streaming fails
async function handleNonStreaming(apiKey: string, question: string, systemPrompt: string) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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
      console.error('Gemini non-streaming error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Gemini API error', details: errorText }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Return as a single SSE event so the client can parse it the same way
    const encoder = new TextEncoder();
    const openaiFormat = { choices: [{ delta: { content: text } }] };
    const ssePayload = `data: ${JSON.stringify(openaiFormat)}\n\ndata: [DONE]\n\n`;

    return new Response(encoder.encode(ssePayload), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    console.error('Gemini non-streaming fallback error:', e);
    return new Response(
      JSON.stringify({ error: 'Gemini API completely failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
