'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SessionContext, QAPair } from '@/lib/types';

interface SessionState {
  session: SessionContext | null;
  history: QAPair[];
  warnings: string[];
}

interface SessionActions {
  setSession: (session: SessionContext) => void;
  addQAPair: (pair: QAPair) => void;
  addWarning: (warning: string) => void;
  clearSession: () => void;
}

type SessionStore = SessionState & SessionActions;

const SessionStoreContext = createContext<SessionStore | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionContext | null>(null);
  const [history, setHistory] = useState<QAPair[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const setSession = useCallback((s: SessionContext) => {
    setSessionState(s);
    setHistory([]);
    setWarnings([]);
  }, []);

  const addQAPair = useCallback((pair: QAPair) => {
    setHistory((prev) => [...prev, pair]);
  }, []);

  const addWarning = useCallback((warning: string) => {
    setWarnings((prev) => {
      if (prev.includes(warning)) return prev;
      return [...prev, warning];
    });
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    setHistory([]);
    setWarnings([]);
  }, []);

  return (
    <SessionStoreContext.Provider
      value={{ session, history, warnings, setSession, addQAPair, addWarning, clearSession }}
    >
      {children}
    </SessionStoreContext.Provider>
  );
}

export function useSession(): SessionStore {
  const ctx = useContext(SessionStoreContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
