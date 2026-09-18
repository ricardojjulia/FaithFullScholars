'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { usePathname } from 'next/navigation';

interface FeedbackSessionContextValue {
  sessionId: string | null;
  breadcrumbs: string[];
  sessionDurationSeconds: number;
  isEnabled: boolean;
}

const FeedbackSessionContext = createContext<FeedbackSessionContextValue>({
  sessionId: null,
  breadcrumbs: [],
  sessionDurationSeconds: 0,
  isEnabled: false,
});

const STORAGE_KEY = 'faithfull_pilot_session_id';
const START_TIME_KEY = 'faithfull_pilot_session_start';
const MAX_BREADCRUMBS = 5;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedSessionId: string | null = null;

function getClientSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  if (!cachedSessionId) {
    try {
      let stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) {
        stored = generateUUID();
        sessionStorage.setItem(STORAGE_KEY, stored);
      }
      cachedSessionId = stored;
    } catch {
      cachedSessionId = generateUUID();
    }
  }
  return cachedSessionId;
}

function subscribeNoop() {
  return () => {};
}

export function FeedbackSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isEnabled = process.env.NEXT_PUBLIC_PILOT_FEEDBACK_ENABLED === 'true';

  // Read session ID synchronously on client, null on server (SSR & hydration safe, no setState in effect)
  const sessionId = useSyncExternalStore(
    subscribeNoop,
    () => (isEnabled ? getClientSessionId() : null),
    () => null
  );

  // Derive breadcrumbs during render when pathname changes (idiomatic React pattern avoiding cascading effect renders)
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);
  const [prevPath, setPrevPath] = useState<string | null>(null);

  if (isEnabled && pathname && pathname !== prevPath) {
    setPrevPath(pathname);
    setBreadcrumbs((prev) => {
      if (prev[prev.length - 1] === pathname) return prev;
      return [...prev, pathname].slice(-MAX_BREADCRUMBS);
    });
  }

  // Track session duration
  const [sessionDurationSeconds, setSessionDurationSeconds] = useState(0);

  useEffect(() => {
    if (!isEnabled) return;

    let startMs: number;
    try {
      const stored = sessionStorage.getItem(START_TIME_KEY);
      const parsed = stored ? parseInt(stored, 10) : null;
      if (parsed && !isNaN(parsed)) {
        startMs = parsed;
      } else {
        startMs = Date.now();
        sessionStorage.setItem(START_TIME_KEY, String(startMs));
      }
    } catch {
      startMs = Date.now();
    }

    const interval = setInterval(() => {
      setSessionDurationSeconds(
        Math.max(0, Math.floor((Date.now() - startMs) / 1000))
      );
    }, 5000);

    return () => clearInterval(interval);
  }, [isEnabled]);

  const value: FeedbackSessionContextValue = {
    sessionId,
    breadcrumbs,
    sessionDurationSeconds,
    isEnabled,
  };

  return (
    <FeedbackSessionContext.Provider value={value}>
      {children}
    </FeedbackSessionContext.Provider>
  );
}

export function useFeedbackSession(): FeedbackSessionContextValue {
  return useContext(FeedbackSessionContext);
}
