'use client';

import React from 'react';

interface AnswerDisplayProps {
  answer: string;
  isStreaming: boolean;
  error: string | null;
  onRetry?: () => void;
}

export default function AnswerDisplay({ answer, isStreaming, error, onRetry }: AnswerDisplayProps) {
  if (error) {
    return (
      <div className="w-full">
        <button
          onClick={onRetry}
          className="text-red-400 text-xl leading-relaxed hover:text-red-300 transition-colors duration-150 cursor-pointer text-left"
        >
          {error}
        </button>
      </div>
    );
  }

  if (!answer && !isStreaming) {
    return (
      <div className="w-full flex items-center justify-center py-20">
        <div className="text-center">
          <div className="text-6xl mb-4">🎤</div>
          <p className="text-slate-400 text-lg">
            Tap the microphone and ask a question
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Your answer will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <p className="text-xl leading-relaxed text-white whitespace-pre-wrap">
        {answer}
        {isStreaming && (
          <span className="inline-block w-0.5 h-5 bg-blue-400 ml-0.5 animate-pulse align-text-bottom" />
        )}
      </p>
    </div>
  );
}
