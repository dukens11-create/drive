'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AdminImportJob, AdminOverview, adminApi, apiBaseUrl, decodeToken, loginAdmin, Session } from '@/lib/api';

const SESSION_KEY = 'drive-admin-session';
const THEME_KEY = 'drive-admin-theme';
const MIN_POLL_INTERVAL_MS = 15000;
const DEFAULT_POLL_INTERVAL_MS = Math.max(MIN_POLL_INTERVAL_MS, Number(process.env.NEXT_PUBLIC_ADMIN_POLL_INTERVAL_MS || '60000'));

type ThemeValue = {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
};

type AuthValue = {
  ready: boolean;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

type AdminValue = {
  loading: boolean;
  error: string | null;
  overview: AdminOverview | null;
  notifications: Array<{ id: string; title: string; message: string; createdAt: string }>;
  lastApiKey: string | null;
  refresh: () => Promise<void>;
  approveDriver: (userId: string, approved: boolean) => Promise<void>;
  suspendUser: (userId: string, suspend: boolean) => Promise<void>;
  updateTicket: (ticketId: string, status: string, resolution?: string) => Promise<void>;
  replyTicket: (ticketId: string, message: string) => Promise<void>;
  updateIncident: (incidentId: string, status: string, details?: string) => Promise<void>;
  updateSettings: (payload: Record<string, unknown>) => Promise<void>;
  upsertPromo: (payload: Record<string, unknown>) => Promise<void>;
  upsertMarket: (payload: Record<string, unknown>) => Promise<void>;
  exportData: (payload: Record<string, unknown>) => Promise<{ content: string; contentType: string; filename: string }>;
  importData: (payload: Record<string, unknown>) => Promise<{ preview?: AdminImportJob; importJob?: AdminImportJob }>;
  bulkOperation: (payload: Record<string, unknown>) => Promise<void>;
  createApiKey: (name: string) => Promise<void>;
  revokeApiKey: (apiKeyId: string) => Promise<void>;
};

const ThemeContext = createContext<ThemeValue | null>(null);
const AuthContext = createContext<AuthValue | null>(null);
const AdminContext = createContext<AdminValue | null>(null);

function createNotification(title: string, message: string) {
  return {
    id: `${title}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    message,
    createdAt: new Date().toISOString()
  };
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function toggleTheme() {
    setTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      window.localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }

  const value = useMemo(() => ({ theme, toggleTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as Session;
      parsed.user = parsed.user || decodeToken(parsed.accessToken);
      return parsed;
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
      return null;
    }
  });

  useEffect(() => {
    setReady(true);
  }, []);

  async function login(email: string, password: string) {
    const next = await loginAdmin(email, password);
    setSession(next);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  }

  function logout() {
    setSession(null);
    window.localStorage.removeItem(SESSION_KEY);
  }

  const value = useMemo(() => ({ ready, session, login, logout }), [ready, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function AdminProvider({ children }: { children: React.ReactNode }) {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('Auth context missing');
  const { session } = auth;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; createdAt: string }>>([]);
  const [lastApiKey, setLastApiKey] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      return;
    }
    setLoading(true);
    try {
      const response = await adminApi.fetchOverview(session.accessToken);
      setOverview(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      if (socketRef.current) socketRef.current.disconnect();
      return;
    }
    void refresh();
    refreshTimer.current = window.setInterval(() => {
      void refresh();
    }, DEFAULT_POLL_INTERVAL_MS);
    const socket = io(apiBaseUrl, {
      transports: ['websocket', 'polling'],
      auth: { token: session.accessToken }
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      setNotifications(current => [createNotification('Connected', 'Live admin updates are active.'), ...current].slice(0, 8));
    });
    socket.on('admin:driver_status', (payload: { driverId?: string; available?: boolean }) => {
      setNotifications(current => [createNotification('Driver update', `${payload.driverId || 'Driver'} is now ${payload.available ? 'available' : 'offline'}.`), ...current].slice(0, 8));
      void refresh();
    });
    socket.on('admin:sos_alert', (payload: { userId?: string; level?: string }) => {
      setNotifications(current => [createNotification('Safety alert', `${payload.userId || 'User'} triggered an SOS (${payload.level || 'high'}).`), ...current].slice(0, 8));
      void refresh();
    });
    socket.on('ride:driver_location', () => {
      void refresh();
    });
    return () => {
      if (refreshTimer.current) window.clearInterval(refreshTimer.current);
      socket.disconnect();
    };
  }, [refresh, session]);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    if (!session) return;
    setLoading(true);
    try {
      await action();
      await refresh();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoading(false);
    }
  }, [refresh, session]);

  const value = useMemo<AdminValue>(() => ({
    loading,
    error,
    overview,
    notifications,
    lastApiKey,
    refresh,
    approveDriver: (userId, approved) => run(() => adminApi.approveDriver(session!.accessToken, userId, approved)),
    suspendUser: (userId, suspend) => run(() => adminApi.suspendUser(session!.accessToken, userId, suspend)),
    updateTicket: (ticketId, status, resolution) => run(() => adminApi.updateTicket(session!.accessToken, ticketId, status, resolution)),
    replyTicket: (ticketId, message) => run(() => adminApi.replyTicket(session!.accessToken, ticketId, message)),
    updateIncident: (incidentId, status, details) => run(() => adminApi.updateIncident(session!.accessToken, incidentId, status, details)),
    updateSettings: payload => run(() => adminApi.updateSettings(session!.accessToken, payload)),
    upsertPromo: payload => run(() => adminApi.upsertPromo(session!.accessToken, payload)),
    upsertMarket: payload => run(() => adminApi.upsertMarket(session!.accessToken, payload)),
    exportData: async payload => {
      if (!session) throw new Error('Not authenticated');
      setLoading(true);
      try {
        const response = await adminApi.exportData(session.accessToken, payload);
        await refresh();
        setError(null);
        return {
          content: response.export.content,
          contentType: response.export.contentType,
          filename: response.export.filename
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to export data');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    importData: async payload => {
      if (!session) throw new Error('Not authenticated');
      setLoading(true);
      try {
        const response = await adminApi.importData(session.accessToken, payload);
        await refresh();
        setError(null);
        return response;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to import data');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    bulkOperation: payload => run(() => adminApi.bulkOperation(session!.accessToken, payload)),
    createApiKey: async name => {
      if (!session) return;
      setLoading(true);
      try {
        const response = await adminApi.createApiKey(session.accessToken, name);
        setLastApiKey(response.plainTextKey);
        await refresh();
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to create API key');
      } finally {
        setLoading(false);
      }
    },
    revokeApiKey: apiKeyId => run(() => adminApi.revokeApiKey(session!.accessToken, apiKeyId))
  }), [error, lastApiKey, loading, notifications, overview, refresh, run, session]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminProvider>{children}</AdminProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('Theme context missing');
  return context;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Auth context missing');
  return context;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('Admin context missing');
  return context;
}
