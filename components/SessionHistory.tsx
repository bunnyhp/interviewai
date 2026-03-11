'use client';

import React, { useState } from 'react';
import { QAPair } from '@/lib/types';

interface SessionHistoryProps {
  history: QAPair[];
}

export default function SessionHistory({ history }: SessionHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (history.length === 0) return null;

  return (
    <div className="w-full mt-8 border-t border-slate-700/50 pt-6">
      <button
        onClick={() => setExpandedId(expandedId ? null : '__all__')}
        className="text-sm text-slate-400 hover:text-slate-300 transition-colors duration-150 mb-4 flex items-center gap-1.5"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform duration-150 ${expandedId === '__all__' ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Previous Questions ({history.length})
      </button>

      {expandedId === '__all__' && (
        <div className="space-y-3">
          {[...history].reverse().map((pair) => (
            <div
              key={pair.id}
              className="bg-slate-800/50 rounded-lg border border-slate-700/30 overflow-hidden"
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === pair.id ? '__all__' : pair.id)
                }
                className="w-full text-left px-4 py-3 hover:bg-slate-700/30 transition-colors duration-150"
              >
                <p className="text-sm text-slate-400 italic truncate">
                  &ldquo;{pair.question}&rdquo;
                </p>
              </button>
              {expandedId === pair.id && (
                <div className="px-4 pb-4 border-t border-slate-700/30">
                  <p className="text-sm text-white leading-relaxed mt-3 whitespace-pre-wrap">
                    {pair.answer}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(pair.answer)}
                      className="text-xs text-slate-500 hover:text-blue-400 transition-colors duration-150 flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                    <span className="text-xs text-slate-600">
                      {new Date(pair.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
