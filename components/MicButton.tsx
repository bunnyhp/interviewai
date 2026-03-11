'use client';

import React from 'react';
import { MicState } from '@/lib/types';

interface MicButtonProps {
  state: MicState;
  onTap: () => void;
  isWhisperMode?: boolean;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
}

export default function MicButton({
  state,
  onTap,
  isWhisperMode = false,
  onHoldStart,
  onHoldEnd,
}: MicButtonProps) {
  const getButtonStyles = () => {
    switch (state) {
      case 'listening':
        return 'bg-red-500 animate-mic-pulse shadow-lg shadow-red-500/30';
      case 'processing':
        return 'bg-blue-500 shadow-lg shadow-blue-500/30';
      case 'streaming':
        return 'bg-blue-500/50 cursor-not-allowed';
      default:
        return 'bg-slate-700 hover:bg-slate-600 shadow-lg shadow-slate-900/50';
    }
  };

  const getIcon = () => {
    switch (state) {
      case 'listening':
        return (
          // Stop / square icon
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        );
      case 'processing':
        return (
          // Spinning circle
          <svg className="animate-mic-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'streaming':
        return (
          // Dots animation
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        );
      default:
        return (
          // Microphone icon
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        );
    }
  };

  const getLabel = () => {
    switch (state) {
      case 'listening':
        return 'Listening...';
      case 'processing':
        return 'Thinking...';
      case 'streaming':
        return 'Generating answer...';
      default:
        return isWhisperMode ? 'Hold to Record' : 'Tap to Speak';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={!isWhisperMode ? onTap : undefined}
        onMouseDown={isWhisperMode ? onHoldStart : undefined}
        onMouseUp={isWhisperMode ? onHoldEnd : undefined}
        onTouchStart={isWhisperMode ? onHoldStart : undefined}
        onTouchEnd={isWhisperMode ? onHoldEnd : undefined}
        disabled={state === 'streaming'}
        className={`
          w-20 h-20 rounded-full flex items-center justify-center text-white
          transition-all duration-150 ease-in-out
          ${getButtonStyles()}
        `}
        aria-label={getLabel()}
      >
        {getIcon()}
      </button>
      <span className="text-sm text-slate-400 font-medium">
        {getLabel()}
      </span>
    </div>
  );
}
