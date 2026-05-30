'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, HttpError } from '../lib/api';
import { getStoredSession, setStoredSession } from '../lib/auth-storage';
import type { AuthSession, LocaleCode, TextScale, ThemeMode } from '../lib/types';

type Preferences = {
  theme: ThemeMode;
  locale: LocaleCode;
  highContrast: boolean;
  textScale: TextScale;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
};

type AppContextValue = {
  session: AuthSession | null;
  preferences: Preferences;
  banner: string | null;
  setBanner: (value: string | null) => void;
  setTheme: (value: ThemeMode) => void;
  setLocale: (value: LocaleCode) => void;
  setHighContrast: (value: boolean) => void;
  setTextScale: (value: TextScale) => void;
  updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  signIn: (payload: { email?: string; phone?: string; password: string }) => Promise<void>;
  signUp: (payload: { email?: string; phone?: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const defaultPreferences: Preferences = {
  theme: 'dark',
  locale: 'en',
  highContrast: false,
  textScale: 'md',
  emailNotifications: true,
  pushNotifications: true,
  marketingEmails: false,
};

const translations: Record<LocaleCode, Record<string, string>> = {
  en: {
    welcome: 'Passenger web command center',
    demo: 'Demo mode',
    connected: 'Connected mode',
  },
  es: {
    welcome: 'Centro web del pasajero',
    demo: 'Modo demo',
    connected: 'Modo conectado',
  },
  fr: {
    welcome: 'Centre web passager',
    demo: 'Mode démo',
    connected: 'Mode connecté',
  },
};

const preferencesKey = 'drive-passenger-web-preferences';
const AppContext = createContext<AppContextValue | undefined>(undefined);

function loadPreferences(): Preferences {
  if (typeof window === 'undefined') {
    return defaultPreferences;
  }

  try {
    const raw = window.localStorage.getItem(preferencesKey);
    return raw ? { ...defaultPreferences, ...(JSON.parse(raw) as Partial<Preferences>) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

function applyPreferences(preferences: Preferences) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = preferences.theme;
  document.documentElement.dataset.contrast = preferences.highContrast ? 'high' : 'normal';
  document.documentElement.dataset.textScale = preferences.textScale;
}

function messageFromError(error: unknown) {
  if (error instanceof HttpError) {
    return error.message;
  }
  return error instanceof Error ? error.message : 'Unexpected request failure.';
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    setSession(getStoredSession());
    setPreferences(loadPreferences());
  }, []);

  useEffect(() => {
    applyPreferences(preferences);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(preferencesKey, JSON.stringify(preferences));
    }
  }, [preferences]);

  const updatePreference = useCallback(<K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const signIn = useCallback(async (payload: { email?: string; phone?: string; password: string }) => {
    try {
      const nextSession = await authApi.signIn(payload);
      setStoredSession(nextSession);
      setSession(nextSession);
      setBanner('Signed in successfully.');
    } catch (error) {
      setBanner(messageFromError(error));
      throw error;
    }
  }, []);

  const signUp = useCallback(async (payload: { email?: string; phone?: string; password: string }) => {
    try {
      const nextSession = await authApi.signUp(payload);
      setStoredSession(nextSession);
      setSession(nextSession);
      setBanner('Account created.');
    } catch (error) {
      setBanner(messageFromError(error));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best effort
    }
    setStoredSession(null);
    setSession(null);
    setBanner('Signed out.');
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      session,
      preferences,
      banner,
      setBanner,
      setTheme: (value) => updatePreference('theme', value),
      setLocale: (value) => updatePreference('locale', value),
      setHighContrast: (value) => updatePreference('highContrast', value),
      setTextScale: (value) => updatePreference('textScale', value),
      updatePreference,
      signIn,
      signUp,
      signOut,
    }),
    [banner, preferences, session, signIn, signOut, signUp, updatePreference],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used inside AppProviders');
  }
  return context;
}

export function useTranslation() {
  const { preferences } = useAppState();
  return useCallback((key: string) => translations[preferences.locale][key] || key, [preferences.locale]);
}
