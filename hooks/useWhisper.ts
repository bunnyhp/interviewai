'use client';

import { useState, useRef, useCallback } from 'react';

interface WhisperHook {
  isRecording: boolean;
  transcript: string;
  error: string | null;
  startRecording: () => void;
  stopRecording: () => Promise<string>;
  setTranscript: (text: string) => void;
}

// Detect the best supported MIME type for MediaRecorder
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';

  // Priority order: webm (Chrome/Firefox) → mp4 (iOS Safari) → default
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return ''; // Let the browser decide
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) return 'mp4';
  if (mimeType.includes('aac')) return 'aac';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'webm';
}

export function useWhisper(): WhisperHook {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscriptState] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>('');
  const resolveRef = useRef<((text: string) => void) | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscriptState('');
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const options: MediaRecorderOptions = {};
      if (mimeType) {
        options.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release the mic
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const actualMime = mimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(chunksRef.current, { type: actualMime });
        chunksRef.current = [];

        // Need at least some audio data
        if (audioBlob.size < 100) {
          if (resolveRef.current) {
            resolveRef.current('');
            resolveRef.current = null;
          }
          return;
        }

        try {
          const ext = getFileExtension(actualMime);
          const formData = new FormData();
          formData.append('file', audioBlob, `recording.${ext}`);

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const data = await response.json();
          const text = data.transcript || '';
          setTranscriptState(text);
          if (resolveRef.current) {
            resolveRef.current(text);
            resolveRef.current = null;
          }
        } catch {
          setError('Transcription failed. Please try again.');
          if (resolveRef.current) {
            resolveRef.current('');
            resolveRef.current = null;
          }
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setError('Microphone access needed. Please allow microphone permissions in your browser settings.');
      } else {
        setError('Could not access microphone. Please check your settings and try again.');
      }
    }
  }, []);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        setIsRecording(false);
        mediaRecorderRef.current.stop();
      } else {
        // Release stream if recorder never started properly
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        resolve('');
      }
    });
  }, []);

  const setTranscript = useCallback((text: string) => {
    setTranscriptState(text);
  }, []);

  return {
    isRecording,
    transcript,
    error,
    startRecording,
    stopRecording,
    setTranscript,
  };
}
