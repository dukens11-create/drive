import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { AuthSession, DriverProfileResponse } from '../types/api';
import { REQUIRED_DRIVER_DOCUMENTS } from '../constants/onboarding';
import { authApi } from '../services/api/authApi';
import { configureApiAuth, HttpError } from '../services/api/client';
import { logError, logEvent, startPerformanceTimer } from '../services/observability';
import { driversApi } from '../services/api/driversApi';
import { sessionStorage } from '../services/storage/sessionStorage';

type AuthState = 'loading' | 'signed_out' | 'signed_in';

type OnboardingStep = 'application' | 'documents' | 'kyc' | 'ready';

type AuthContextValue = {
  state: AuthState;
  session: AuthSession | null;
  isOnboardingLoading: boolean;
  onboardingStep: OnboardingStep;
  onboardingProfile: DriverProfileResponse | null;
  errorMessage: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshOnboarding: () => Promise<void>;
  completeApplication: (location: { lat: number; lng: number }) => Promise<void>;
  submitDocuments: (documents: string[]) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const getOnboardingStep = (profile: DriverProfileResponse | null): OnboardingStep => {
  if (!profile) {
    return 'application';
  }
  if (profile.status === 'approved' && profile.verificationState === 'verified') {
    return 'ready';
  }
  if ((profile.documents ?? []).length < REQUIRED_DRIVER_DOCUMENTS || profile.verificationState === 'documents_pending') {
    return 'documents';
  }
  if (profile.verificationState === 'kyc_pending') {
    return 'kyc';
  }
  return 'application';
};

const errorMessageFrom = (error: unknown) => {
  if (error instanceof HttpError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unexpected request error.';
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>('loading');
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isOnboardingLoading, setIsOnboardingLoading] = useState(false);
  const [onboardingProfile, setOnboardingProfile] = useState<DriverProfileResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sessionRef = useRef<AuthSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const persistSession = useCallback(async (nextSession: AuthSession | null) => {
    setSession(nextSession);
    sessionRef.current = nextSession;
    if (nextSession) {
      await sessionStorage.save(nextSession);
      setState('signed_in');
      return;
    }
    await sessionStorage.clear();
    setState('signed_out');
  }, []);

  const refreshSession = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) {
      return false;
    }

    const stopRefreshTimer = startPerformanceTimer('auth_refresh_duration');
    try {
      const refreshed = await authApi.refresh(current.refreshToken);
      const nextSession: AuthSession = {
        ...current,
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      };
      await persistSession(nextSession);
      stopRefreshTimer({ success: true });
      logEvent('auth_session_refreshed');
      return true;
    } catch (error) {
      stopRefreshTimer({ success: false });
      logError('auth_refresh_failed', error);
      await persistSession(null);
      return false;
    }
  }, [persistSession]);

  useEffect(() => {
    configureApiAuth({
      getSession: () => (sessionRef.current ? { accessToken: sessionRef.current.accessToken, refreshToken: sessionRef.current.refreshToken } : null),
      refreshSession,
    });

    return () => configureApiAuth(null);
  }, [refreshSession]);

  const refreshOnboarding = useCallback(async () => {
    if (!sessionRef.current) {
      setOnboardingProfile(null);
      return;
    }

    setIsOnboardingLoading(true);
    setErrorMessage(null);
    try {
      const profileResponse = await driversApi.me();
      setOnboardingProfile(profileResponse.profile);
    } catch (error) {
      if (error instanceof HttpError && error.message.includes('driver not found')) {
        setOnboardingProfile(null);
      } else {
        setErrorMessage(errorMessageFrom(error));
      }
    } finally {
      setIsOnboardingLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      const savedSession = await sessionStorage.load();
      if (!active) {
        return;
      }
      if (!savedSession) {
        await persistSession(null);
        return;
      }
      await persistSession(savedSession);
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [persistSession]);

  useEffect(() => {
    if (state !== 'signed_in') {
      setOnboardingProfile(null);
      return;
    }
    void refreshOnboarding();
  }, [refreshOnboarding, state]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setErrorMessage(null);
      const stopSignInTimer = startPerformanceTimer('auth_sign_in_duration');
      try {
        const nextSession = await authApi.signIn({ email, password });
        await persistSession(nextSession);
        await refreshOnboarding();
        stopSignInTimer({ success: true });
        logEvent('auth_sign_in_succeeded');
      } catch (error) {
        stopSignInTimer({ success: false });
        logError('auth_sign_in_failed', error);
        throw error;
      }
    },
    [persistSession, refreshOnboarding]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      setErrorMessage(null);
      const stopSignUpTimer = startPerformanceTimer('auth_sign_up_duration');
      try {
        const nextSession = await authApi.signUp({ email, password, role: 'driver' });
        await persistSession(nextSession);
        await refreshOnboarding();
        stopSignUpTimer({ success: true });
        logEvent('auth_sign_up_succeeded');
      } catch (error) {
        stopSignUpTimer({ success: false });
        logError('auth_sign_up_failed', error);
        throw error;
      }
    },
    [persistSession, refreshOnboarding]
  );

  const signOut = useCallback(async () => {
    setErrorMessage(null);
    logEvent('auth_sign_out_started');
    const current = sessionRef.current;
    if (current) {
      try {
        await authApi.logout(current.refreshToken);
      } catch {
        // best effort logout
      }
    }
    await persistSession(null);
    logEvent('auth_sign_out_completed');
  }, [persistSession]);

  const completeApplication = useCallback(
    async (location: { lat: number; lng: number }) => {
      setErrorMessage(null);
      const stopTimer = startPerformanceTimer('driver_application_submission_duration');
      try {
        await driversApi.apply(location);
        await refreshOnboarding();
        stopTimer({ success: true });
        logEvent('driver_application_submitted');
      } catch (error) {
        stopTimer({ success: false });
        logError('driver_application_submit_failed', error);
        throw error;
      }
    },
    [refreshOnboarding]
  );

  const submitDocuments = useCallback(
    async (documents: string[]) => {
      setErrorMessage(null);
      const stopTimer = startPerformanceTimer('driver_documents_submission_duration');
      try {
        await driversApi.documents(documents);
        await refreshOnboarding();
        stopTimer({ success: true, documentCount: documents.length });
        logEvent('driver_documents_submitted', { documentCount: documents.length });
      } catch (error) {
        stopTimer({ success: false, documentCount: documents.length });
        logError('driver_documents_submit_failed', error, { documentCount: documents.length });
        throw error;
      }
    },
    [refreshOnboarding]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      session,
      isOnboardingLoading,
      onboardingStep: getOnboardingStep(onboardingProfile),
      onboardingProfile,
      errorMessage,
      signIn,
      signUp,
      signOut,
      refreshOnboarding,
      completeApplication,
      submitDocuments,
    }),
    [state, session, isOnboardingLoading, onboardingProfile, errorMessage, signIn, signUp, signOut, refreshOnboarding, completeApplication, submitDocuments]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
