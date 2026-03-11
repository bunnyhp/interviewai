'use client';

import React from 'react';

interface TranscriptPreviewProps {
  transcript: string;
  isListening: boolean;
  onEdit: (text: string) => void;
}

export default function TranscriptPreview({
  transcript,
  isListening,
  onEdit,
}: TranscriptPreviewProps) {
  if (!transcript && !isListening) return null;

  return (
    <div className="w-full max-w-xl mx-auto mt-3">
      {isListening && !transcript && (
        <div className="flex items-center justify-center gap-1.5 py-2">
          <div className="flex gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1 bg-red-400 rounded-full animate-pulse"
                style={{
                  height: `${12 + Math.random() * 12}px`,
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '0.6s',
                }}
              />
            ))}
          </div>
          <span className="text-sm text-slate-400 ml-2">Listening...</span>
        </div>
      )}
      {transcript && (
        <textarea
          value={transcript}
          onChange={(e) => onEdit(e.target.value)}
          className="w-full bg-transparent border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none transition-all duration-150"
          rows={2}
          placeholder="Your question will appear here..."
        />
      )}
    </div>
  );
}
