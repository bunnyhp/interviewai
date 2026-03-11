'use client';

import { useState, useCallback, useRef } from 'react';
import { AIModel } from '@/lib/types';

interface StreamingAnswerHook {
  answer: string;
  isStreaming: boolean;
  error: string | null;
  streamAnswer: (question: string, systemPrompt: string, aiModel?: AIModel) => Promise<string>;
  resetAnswer: () => void;
}

export function useStreamingAnswer(): StreamingAnswerHook {
  const [answer, setAnswer] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const streamAnswer = useCallback(
    async (question: string, systemPrompt: string, aiModel: AIModel = 'gpt-4o'): Promise<string> => {
      // Abort any previous stream
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setAnswer('');
      setIsStreaming(true);
      setError(null);

      let fullAnswer = '';

      // Route to correct API based on model choice
      const endpoint = aiModel === 'gemini' ? '/api/answer-gemini' : '/api/answer';

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, systemPrompt }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullAnswer += content;
                  setAnswer((prev) => prev + content);
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        }

        setIsStreaming(false);
        return fullAnswer;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Intentional abort — not an error
          return fullAnswer;
        }
        setError('Something went wrong. Tap to try again.');
        setIsStreaming(false);
        return fullAnswer;
      }
    },
    []
  );

  const resetAnswer = useCallback(() => {
    setAnswer('');
    setError(null);
  }, []);

  return {
    answer,
    isStreaming,
    error,
    streamAnswer,
    resetAnswer,
  };
}
