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

export function useWhisper(): WhisperHook {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscriptState] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveRef = useRef<((text: string) => void) | null>(null);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscriptState('');
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks to release the mic
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];

        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');

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
    } catch {
      setError('Microphone access needed. Click to retry.');
    }
  }, []);

  const stopRecording = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        setIsRecording(false);
        mediaRecorderRef.current.stop();
      } else {
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
