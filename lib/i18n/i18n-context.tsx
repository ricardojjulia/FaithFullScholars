'use client';

import React, { createContext, useContext, useSyncExternalStore } from 'react';
import enMessages from './messages/en.json';
import esMessages from './messages/es.json';

export type Locale = 'en' | 'es';

type MessagesRecord = Record<string, unknown>;

const MESSAGES: Record<Locale, MessagesRecord> = {
  en: enMessages,
  es: esMessages
};

interface I18nContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key
});

const listeners = new Set<() => void>();

function subscribeLocale(callback: () => void) {
  listeners.add(callback);
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', callback);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', callback);
    }
  };
}

function getLocaleSnapshot(): Locale {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem('fs_locale') as Locale;
    if (saved === 'en' || saved === 'es') {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'en';
}

function getServerLocaleSnapshot(): Locale {
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot
  );

  function setLocale(newLocale: Locale) {
    try {
      localStorage.setItem('fs_locale', newLocale);
      document.cookie = `fs_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // non-blocking
    }
    listeners.forEach((listener) => listener());
  }

  function t(key: string, variables?: Record<string, string | number>): string {
    const keys = key.split('.');
    let value: unknown = MESSAGES[locale];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as MessagesRecord)[k];
      } else {
        // Fallback to English if key missing in current locale
        let fallbackVal: unknown = MESSAGES['en'];
        for (const fbKey of keys) {
          if (fallbackVal && typeof fallbackVal === 'object' && fbKey in fallbackVal) {
            fallbackVal = (fallbackVal as MessagesRecord)[fbKey];
          } else {
            return key;
          }
        }
        value = fallbackVal;
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    let result = value;
    if (variables) {
      for (const [varKey, varVal] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${varKey}}}`, 'g'), String(varVal));
      }
    }

    return result;
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  return useContext(I18nContext);
}
