'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from '@/store/sessionStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useWhisper } from '@/hooks/useWhisper';
import { useStreamingAnswer } from '@/hooks/useStreamingAnswer';
import MicButton from '@/components/MicButton';
import AnswerDisplay from '@/components/AnswerDisplay';
import TranscriptPreview from '@/components/TranscriptPreview';
import SessionHistory from '@/components/SessionHistory';
import { MicState } from '@/lib/types';

export default function InterviewPage() {
  const router = useRouter();
  const { session, history, warnings, addQAPair } = useSession();

  const speech = useSpeechRecognition();
  const whisper = useWhisper();
  const streaming = useStreamingAnswer();

  const [micState, setMicState] = useState<MicState>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [useWhisperMode, setUseWhisperMode] = useState(false);
  const [manualQuestion, setManualQuestion] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Redirect to setup if no session context
  useEffect(() => {
    if (!session) {
      router.push('/setup');
    }
  }, [session, router]);

  // Detect Web Speech API support
  useEffect(() => {
    if (!speech.isSupported) {
      setUseWhisperMode(true);
    }
  }, [speech.isSupported]);

  // Sync transcript from speech recognition
  useEffect(() => {
    if (speech.transcript) {
      setCurrentTranscript(speech.transcript);
    }
  }, [speech.transcript]);

  // Handle auto-stop after silence (Web Speech API)
  useEffect(() => {
    if (!speech.isListening && micState === 'listening' && currentTranscript.trim()) {
      handleSubmitQuestion(currentTranscript.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.isListening]);

  const handleSubmitQuestion = useCallback(
    async (question: string) => {
      if (!question || !session) return;

      setMicState('processing');

      const fullAnswer = await streaming.streamAnswer(question, session.systemPrompt, session.aiModel);
      setMicState('idle');

      if (fullAnswer) {
        addQAPair({
          id: uuidv4(),
          question,
          answer: fullAnswer,
          timestamp: new Date(),
        });
      }

      setCurrentTranscript('');
      speech.resetTranscript();
    },
    [session, streaming, addQAPair, speech]
  );

  // Update mic state based on streaming
  useEffect(() => {
    if (streaming.isStreaming) {
      setMicState('streaming');
    }
  }, [streaming.isStreaming]);

  const handleMicTap = useCallback(() => {
    if (micState === 'listening') {
      // Stop listening
      speech.stopListening();
      if (currentTranscript.trim()) {
        handleSubmitQuestion(currentTranscript.trim());
      } else {
        setMicState('idle');
      }
    } else if (micState === 'idle') {
      // Start listening
      setMicState('listening');
      setCurrentTranscript('');
      streaming.resetAnswer();
      speech.startListening();
    }
  }, [micState, currentTranscript, speech, streaming, handleSubmitQuestion]);

  // Whisper mode handlers
  const handleHoldStart = useCallback(() => {
    if (micState !== 'idle') return;
    setMicState('listening');
    setCurrentTranscript('');
    streaming.resetAnswer();
    whisper.startRecording();
  }, [micState, streaming, whisper]);

  const handleHoldEnd = useCallback(async () => {
    if (micState !== 'listening') return;
    const transcript = await whisper.stopRecording();
    if (transcript.trim()) {
      setCurrentTranscript(transcript);
      handleSubmitQuestion(transcript.trim());
    } else {
      setMicState('idle');
    }
  }, [micState, whisper, handleSubmitQuestion]);

  const handleTranscriptEdit = useCallback(
    (text: string) => {
      setCurrentTranscript(text);
      speech.setTranscript(text);
    },
    [speech]
  );

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            Interview<span className="text-blue-500">AI</span>
          </span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-400 truncate max-w-[200px]">
            {session.roleTitle} at {session.companyName}
          </span>
          <span className="text-xs text-slate-500">•</span>
          {(() => {
            const displayModel = streaming.activeModel || session.aiModel;
            const isFallback = streaming.activeModel && streaming.activeModel !== session.aiModel;
            const isGemini = displayModel === 'gemini';
            return (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isGemini
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {isGemini ? 'Gemini' : 'GPT-4o'}
                {isFallback && ' (fallback)'}
              </span>
            );
          })()}
        </div>
        <button
          onClick={() => router.push('/setup')}
          className="text-sm text-slate-400 hover:text-white transition-colors duration-150 flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          New Session
        </button>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-yellow-400">{w}</p>
          ))}
        </div>
      )}

      {/* Error from speech/whisper */}
      {(speech.error || whisper.error) && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-400">{speech.error || whisper.error}</p>
        </div>
      )}

      {/* Top Zone: Answer area (scrollable) */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 pb-64">
        <div className="max-w-3xl mx-auto">
          <AnswerDisplay
            answer={streaming.answer}
            isStreaming={streaming.isStreaming}
            error={streaming.error}
            onRetry={() => {
              if (currentTranscript.trim()) {
                handleSubmitQuestion(currentTranscript.trim());
              }
            }}
          />
          <SessionHistory history={history} />
        </div>
      </div>

      {/* Bottom Zone: Mic controls (fixed) */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a] to-transparent pt-12 pb-8 px-4">
        <div className="max-w-xl mx-auto flex flex-col items-center">
          <MicButton
            state={micState}
            onTap={handleMicTap}
            isWhisperMode={useWhisperMode}
            onHoldStart={handleHoldStart}
            onHoldEnd={handleHoldEnd}
          />
          <TranscriptPreview
            transcript={currentTranscript}
            isListening={micState === 'listening'}
            onEdit={handleTranscriptEdit}
          />

          {/* Manual text input fallback */}
          <div className="w-full max-w-xl mt-4">
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors duration-150 mx-auto block mb-2"
            >
              {showManualInput ? 'Hide text input' : 'Or type your question instead'}
            </button>
            {showManualInput && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualQuestion.trim() && micState === 'idle') {
                    setCurrentTranscript(manualQuestion.trim());
                    handleSubmitQuestion(manualQuestion.trim());
                    setManualQuestion('');
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={manualQuestion}
                  onChange={(e) => setManualQuestion(e.target.value)}
                  placeholder="Type your interview question here..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all duration-150"
                  disabled={micState !== 'idle'}
                />
                <button
                  type="submit"
                  disabled={!manualQuestion.trim() || micState !== 'idle'}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                >
                  Ask
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
