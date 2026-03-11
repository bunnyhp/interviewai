'use client';

import { useState, useCallback, useRef } from 'react';
import { AIModel } from '@/lib/types';

interface StreamingAnswerHook {
  answer: string;
  isStreaming: boolean;
  error: string | null;
  activeModel: AIModel | null;
  streamAnswer: (question: string, systemPrompt: string, aiModel?: AIModel) => Promise<string>;
  resetAnswer: () => void;
}

function getEndpoint(model: AIModel): string {
  return model === 'gemini' ? '/api/answer-gemini' : '/api/answer';
}

function getFallbackModel(model: AIModel): AIModel {
  return model === 'gpt-4o' ? 'gemini' : 'gpt-4o';
}

export function useStreamingAnswer(): StreamingAnswerHook {
  const [answer, setAnswer] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<AIModel | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Core fetch + stream logic for a single model
  const tryStream = useCallback(
    async (
      question: string,
      systemPrompt: string,
      model: AIModel,
      signal: AbortSignal
    ): Promise<{ success: boolean; answer: string; errorMsg: string }> => {
      const endpoint = getEndpoint(model);
      let fullAnswer = '';

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, systemPrompt }),
          signal,
        });

        if (!response.ok) {
          let errorMsg = `${model} API error: ${response.status}`;
          try {
            const errData = await response.json();
            if (errData.error) errorMsg = errData.error;
          } catch { /* ignore */ }
          return { success: false, answer: '', errorMsg };
        }

        const reader = response.body?.getReader();
        if (!reader) {
          return { success: false, answer: '', errorMsg: 'No response body' };
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

        return { success: true, answer: fullAnswer, errorMsg: '' };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { success: true, answer: fullAnswer, errorMsg: '' }; // intentional
        }
        return {
          success: false,
          answer: '',
          errorMsg: err instanceof Error ? err.message : 'Unknown error',
        };
      }
    },
    []
  );

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
      setActiveModel(aiModel);

      // Try primary model
      const primary = await tryStream(question, systemPrompt, aiModel, controller.signal);

      if (primary.success && primary.answer) {
        setIsStreaming(false);
        return primary.answer;
      }

      // Primary failed — try fallback model automatically
      const fallbackModel = getFallbackModel(aiModel);
      setAnswer('');
      setActiveModel(fallbackModel);
      setError(null);

      const fallback = await tryStream(question, systemPrompt, fallbackModel, controller.signal);

      if (fallback.success && fallback.answer) {
        setIsStreaming(false);
        return fallback.answer;
      }

      // Both models failed
      setError(
        `Both models failed. ${aiModel}: ${primary.errorMsg}. ${fallbackModel}: ${fallback.errorMsg}. Tap to retry.`
      );
      setIsStreaming(false);
      return '';
    },
    [tryStream]
  );

  const resetAnswer = useCallback(() => {
    setAnswer('');
    setError(null);
    setActiveModel(null);
  }, []);

  return {
    answer,
    isStreaming,
    error,
    activeModel,
    streamAnswer,
    resetAnswer,
  };
}
