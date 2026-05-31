'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { Provider as ReduxProvider, useDispatch } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { pushAlert, setEmail, setLiveOrderCount, setSocketConnected, setVerified, store } from '@/lib/store';

type Session = {
  accessToken: string;
  user: { id: string; email: string; role: 'owner' | 'manager' };
};

type AuthValue = {
  ready: boolean;
  session: Session | null;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => void;
  verifyEmail: (code: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
};

const SESSION_KEY = 'drive-restaurant-session';
const AuthContext = createContext<AuthValue | null>(null);
const queryClient = new QueryClient();

function AppRuntime({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!session) return;
    const socketUrl = process.env.NEXT_PUBLIC_RESTAURANT_SOCKET_URL || process.env.NEXT_PUBLIC_RESTAURANT_API_BASE_URL || 'http://localhost:8080';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      auth: { token: session.accessToken }
    });

    socket.on('connect', () => {
      dispatch(setSocketConnected(true));
      dispatch(pushAlert({ title: 'Socket connected', message: 'Real-time restaurant updates are active.' }));
    });

    socket.on('disconnect', () => dispatch(setSocketConnected(false)));

    socket.on('restaurant:new_order', (payload: { orderId?: string; customer?: string; items?: number }) => {
      dispatch(setLiveOrderCount(Math.max(1, store.getState().realtime.liveOrderCount + 1)));
      dispatch(pushAlert({ title: 'New order', message: `${payload.orderId || 'Order'} from ${payload.customer || 'guest'} (${payload.items || 1} items)` }));
    });

    socket.on('restaurant:metrics', (payload: { pendingOrders?: number }) => {
      if (typeof payload.pendingOrders === 'number') dispatch(setLiveOrderCount(payload.pendingOrders));
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, session]);

  return children;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const remembered = window.localStorage.getItem(SESSION_KEY) || window.sessionStorage.getItem(SESSION_KEY);
    if (remembered) {
      try {
        const parsed = JSON.parse(remembered) as Session;
        setSession(parsed);
        dispatch(setEmail(parsed.user.email));
      } catch {
        window.localStorage.removeItem(SESSION_KEY);
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    }
    setReady(true);
  }, [dispatch]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    if (!email || !password) throw new Error('Email and password are required');
    const nextSession: Session = {
      accessToken: `restaurant-admin-${Date.now()}`,
      user: { id: 'restaurant-admin', email, role: email.includes('owner') ? 'owner' : 'manager' }
    };
    setSession(nextSession);
    dispatch(setEmail(email));
    const storage = rememberMe ? window.localStorage : window.sessionStorage;
    const clearStorage = rememberMe ? window.sessionStorage : window.localStorage;
    clearStorage.removeItem(SESSION_KEY);
    storage.setItem(SESSION_KEY, JSON.stringify(nextSession));
  }, [dispatch]);

  const logout = useCallback(() => {
    setSession(null);
    window.localStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const verifyEmail = useCallback(async (code: string) => {
    if (!/^\d{6}$/.test(code)) throw new Error('Verification code must be 6 digits');
    dispatch(setVerified(true));
  }, [dispatch]);

  const requestPasswordReset = useCallback(async (email: string) => {
    if (!email.includes('@')) throw new Error('Provide a valid email address');
  }, []);

  const value = useMemo(() => ({ ready, session, login, logout, verifyEmail, requestPasswordReset }), [login, logout, ready, requestPasswordReset, session, verifyEmail]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ReduxProvider store={store}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRuntime>{children}</AppRuntime>
          </AuthProvider>
        </QueryClientProvider>
      </ReduxProvider>
    </ThemeProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Auth context missing');
  return context;
}
