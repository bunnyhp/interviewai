'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SessionContext, QAPair } from '@/lib/types';

interface SessionState {
  session: SessionContext | null;
  sessionId: string | null;
  history: QAPair[];
  warnings: string[];
}

interface SessionActions {
  setSession: (session: SessionContext, sessionId?: string) => void;
  setSessionId: (id: string) => void;
  addQAPair: (pair: QAPair) => void;
  addWarning: (warning: string) => void;
  setHistory: (history: QAPair[]) => void;
  clearSession: () => void;
}

type SessionStore = SessionState & SessionActions;

const SessionStoreContext = createContext<SessionStore | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionContext | null>(null);
  const [sessionId, setSessionIdState] = useState<string | null>(null);
  const [history, setHistoryState] = useState<QAPair[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const setSession = useCallback((s: SessionContext, id?: string) => {
    setSessionState(s);
    if (id) setSessionIdState(id);
    setHistoryState([]);
    setWarnings([]);
  }, []);

  const setSessionId = useCallback((id: string) => {
    setSessionIdState(id);
  }, []);

  const addQAPair = useCallback((pair: QAPair) => {
    setHistoryState((prev) => [...prev, pair]);
  }, []);

  const setHistory = useCallback((h: QAPair[]) => {
    setHistoryState(h);
  }, []);

  const addWarning = useCallback((warning: string) => {
    setWarnings((prev) => {
      if (prev.includes(warning)) return prev;
      return [...prev, warning];
    });
  }, []);

  const clearSession = useCallback(() => {
    setSessionState(null);
    setSessionIdState(null);
    setHistoryState([]);
    setWarnings([]);
  }, []);

  return (
    <SessionStoreContext.Provider
      value={{
        session,
        sessionId,
        history,
        warnings,
        setSession,
        setSessionId,
        addQAPair,
        addWarning,
        setHistory,
        clearSession,
      }}
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
