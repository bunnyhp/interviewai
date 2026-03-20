'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from '@/store/sessionStore';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useWhisper } from '@/hooks/useWhisper';
import { useStreamingAnswer } from '@/hooks/useStreamingAnswer';
import MicButton from '@/components/MicButton';
import AnswerDisplay from '@/components/AnswerDisplay';
import TranscriptPreview from '@/components/TranscriptPreview';
import SessionHistory from '@/components/SessionHistory';
import { MicState, AIModel } from '@/lib/types';

function InterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, sessionId, history, warnings, addQAPair, setSession, setSessionId, setHistory } = useSession();

  const speech = useSpeechRecognition();
  const whisper = useWhisper();
  const streaming = useStreamingAnswer();

  const [micState, setMicState] = useState<MicState>('idle');
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [useWhisperMode, setUseWhisperMode] = useState(false);
  const [manualQuestion, setManualQuestion] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Load session from URL if not already in memory
  useEffect(() => {
    const urlSessionId = searchParams.get('session');

    if (urlSessionId && !session) {
      setIsLoadingSession(true);
      fetch(`/api/sessions/${urlSessionId}`)
        .then((res) => {
          if (!res.ok) throw new Error('Session not found');
          return res.json();
        })
        .then((data) => {
          const s = data.session;
          setSession(
            {
              resumeText: s.resumeText,
              jobDescription: s.jobDescription,
              roleTitle: s.roleTitle,
              companyName: s.companyName,
              companyResearch: s.companyResearch,
              systemPrompt: s.systemPrompt,
              aiModel: (s.aiModel as AIModel) || 'gpt-4o',
            },
            s.id
          );

          // Restore Q&A history
          if (s.history && s.history.length > 0) {
            const restored = s.history.map((h: { id: string; question: string; answer: string; timestamp: string }) => ({
              id: h.id,
              question: h.question,
              answer: h.answer,
              timestamp: new Date(h.timestamp),
            }));
            setHistory(restored);
          }
        })
        .catch(() => {
          router.push('/setup');
        })
        .finally(() => {
          setIsLoadingSession(false);
        });
    } else if (!urlSessionId && !session) {
      router.push('/setup');
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const pair = {
          id: uuidv4(),
          question,
          answer: fullAnswer,
          timestamp: new Date(),
        };

        addQAPair(pair);

        // Persist Q&A to Redis
        const currentSessionId = sessionId || searchParams.get('session');
        if (currentSessionId) {
          try {
            await fetch(`/api/sessions/${currentSessionId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                qaPair: {
                  id: pair.id,
                  question: pair.question,
                  answer: pair.answer,
                  timestamp: pair.timestamp.toISOString(),
                },
              }),
            });
          } catch {
            // Silently fail — Q&A is still in local state
          }
        }
      }

      setCurrentTranscript('');
      speech.resetTranscript();
    },
    [session, sessionId, searchParams, streaming, addQAPair, speech]
  );

  // Update mic state based on streaming
  useEffect(() => {
    if (streaming.isStreaming) {
      setMicState('streaming');
    }
  }, [streaming.isStreaming]);

  const handleMicTap = useCallback(() => {
    if (micState === 'listening') {
      speech.stopListening();
      if (currentTranscript.trim()) {
        handleSubmitQuestion(currentTranscript.trim());
      } else {
        setMicState('idle');
      }
    } else if (micState === 'idle') {
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

  const handleCopySessionLink = useCallback(() => {
    const currentId = sessionId || searchParams.get('session');
    if (currentId) {
      const url = `${window.location.origin}/interview?session=${currentId}`;
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }, [sessionId, searchParams]);

  if (isLoadingSession || !session) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        <p className="text-sm text-slate-400">Loading session...</p>
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
        <div className="flex items-center gap-3">
          {/* Share button */}
          {(sessionId || searchParams.get('session')) && (
            <button
              onClick={handleCopySessionLink}
              className="text-sm text-slate-400 hover:text-white transition-colors duration-150 flex items-center gap-1"
              title="Copy session link"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}
          {/* Sessions Dashboard */}
          <button
            onClick={() => router.push('/sessions')}
            className="text-sm text-slate-400 hover:text-white transition-colors duration-150 flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Sessions
          </button>
          <button
            onClick={() => router.push('/setup')}
            className="text-sm text-slate-400 hover:text-white transition-colors duration-150 flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
        </div>
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

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  );
}
