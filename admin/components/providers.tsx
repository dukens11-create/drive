'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { AdminImportJob, AdminOverview, adminApi, apiBaseUrl, decodeToken, loginAdmin, Session } from '@/lib/api';

const SESSION_KEY = 'drive-admin-session';
const THEME_KEY = 'drive-admin-theme';
const LOCALE_KEY = 'drive-admin-locale';

export const SUPPORTED_LOCALES = ['en','es','fr','de','it','pt','ru','zh-CN','zh-TW','ja','ko','ar','hi','th','tr','vi','id','nl','pl','sv'] as const;
export type LocaleCode = typeof SUPPORTED_LOCALES[number];
export const DEFAULT_LOCALE: LocaleCode = 'en';
export const RTL_LOCALES = new Set<LocaleCode>(['ar']);
export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', it: 'Italiano',
  pt: 'Português', ru: 'Русский', 'zh-CN': '中文(简)', 'zh-TW': '中文(繁)',
  ja: '日本語', ko: '한국어', ar: 'العربية', hi: 'हिन्दी', th: 'ภาษาไทย',
  tr: 'Türkçe', vi: 'Tiếng Việt', id: 'Bahasa Indonesia', nl: 'Nederlands',
  pl: 'Polski', sv: 'Svenska',
};

type AdminTranslations = Record<string, string>;
const translations: Partial<Record<LocaleCode, AdminTranslations>> = {
  en: {
    dashboard: 'Dashboard', users: 'Users', drivers: 'Drivers', rides: 'Rides',
    orders: 'Orders', payments: 'Payments', reports: 'Reports', settings: 'Settings',
    signIn: 'Sign in', signOut: 'Sign out', loading: 'Loading…', error: 'Error',
    approve: 'Approve', suspend: 'Suspend', refresh: 'Refresh', save: 'Save',
    cancel: 'Cancel', delete: 'Delete', search: 'Search', filter: 'Filter',
    language: 'Language', theme: 'Theme',
  },
  es: {
    dashboard: 'Panel', users: 'Usuarios', drivers: 'Conductores', rides: 'Viajes',
    orders: 'Pedidos', payments: 'Pagos', reports: 'Informes', settings: 'Configuración',
    signIn: 'Iniciar sesión', signOut: 'Cerrar sesión', loading: 'Cargando…', error: 'Error',
    approve: 'Aprobar', suspend: 'Suspender', refresh: 'Actualizar', save: 'Guardar',
    cancel: 'Cancelar', delete: 'Eliminar', search: 'Buscar', filter: 'Filtrar',
    language: 'Idioma', theme: 'Tema',
  },
  fr: {
    dashboard: 'Tableau de bord', users: 'Utilisateurs', drivers: 'Chauffeurs', rides: 'Trajets',
    orders: 'Commandes', payments: 'Paiements', reports: 'Rapports', settings: 'Paramètres',
    signIn: 'Se connecter', signOut: 'Se déconnecter', loading: 'Chargement…', error: 'Erreur',
    approve: 'Approuver', suspend: 'Suspendre', refresh: 'Actualiser', save: 'Enregistrer',
    cancel: 'Annuler', delete: 'Supprimer', search: 'Rechercher', filter: 'Filtrer',
    language: 'Langue', theme: 'Thème',
  },
  de: {
    dashboard: 'Dashboard', users: 'Benutzer', drivers: 'Fahrer', rides: 'Fahrten',
    orders: 'Bestellungen', payments: 'Zahlungen', reports: 'Berichte', settings: 'Einstellungen',
    signIn: 'Anmelden', signOut: 'Abmelden', loading: 'Wird geladen…', error: 'Fehler',
    approve: 'Genehmigen', suspend: 'Sperren', refresh: 'Aktualisieren', save: 'Speichern',
    cancel: 'Abbrechen', delete: 'Löschen', search: 'Suchen', filter: 'Filtern',
    language: 'Sprache', theme: 'Thema',
  },
  it: {
    dashboard: 'Dashboard', users: 'Utenti', drivers: 'Autisti', rides: 'Corse',
    orders: 'Ordini', payments: 'Pagamenti', reports: 'Report', settings: 'Impostazioni',
    signIn: 'Accedi', signOut: 'Disconnetti', loading: 'Caricamento…', error: 'Errore',
    approve: 'Approva', suspend: 'Sospendi', refresh: 'Aggiorna', save: 'Salva',
    cancel: 'Annulla', delete: 'Elimina', search: 'Cerca', filter: 'Filtra',
    language: 'Lingua', theme: 'Tema',
  },
  pt: {
    dashboard: 'Painel', users: 'Usuários', drivers: 'Motoristas', rides: 'Corridas',
    orders: 'Pedidos', payments: 'Pagamentos', reports: 'Relatórios', settings: 'Configurações',
    signIn: 'Entrar', signOut: 'Sair', loading: 'Carregando…', error: 'Erro',
    approve: 'Aprovar', suspend: 'Suspender', refresh: 'Atualizar', save: 'Salvar',
    cancel: 'Cancelar', delete: 'Excluir', search: 'Pesquisar', filter: 'Filtrar',
    language: 'Idioma', theme: 'Tema',
  },
  ru: {
    dashboard: 'Панель', users: 'Пользователи', drivers: 'Водители', rides: 'Поездки',
    orders: 'Заказы', payments: 'Платежи', reports: 'Отчёты', settings: 'Настройки',
    signIn: 'Войти', signOut: 'Выйти', loading: 'Загрузка…', error: 'Ошибка',
    approve: 'Одобрить', suspend: 'Заблокировать', refresh: 'Обновить', save: 'Сохранить',
    cancel: 'Отмена', delete: 'Удалить', search: 'Поиск', filter: 'Фильтр',
    language: 'Язык', theme: 'Тема',
  },
  'zh-CN': {
    dashboard: '控制台', users: '用户', drivers: '司机', rides: '行程',
    orders: '订单', payments: '支付', reports: '报告', settings: '设置',
    signIn: '登录', signOut: '退出', loading: '加载中…', error: '错误',
    approve: '批准', suspend: '暂停', refresh: '刷新', save: '保存',
    cancel: '取消', delete: '删除', search: '搜索', filter: '筛选',
    language: '语言', theme: '主题',
  },
  'zh-TW': {
    dashboard: '控制台', users: '使用者', drivers: '司機', rides: '行程',
    orders: '訂單', payments: '付款', reports: '報告', settings: '設定',
    signIn: '登入', signOut: '登出', loading: '載入中…', error: '錯誤',
    approve: '批准', suspend: '暫停', refresh: '重新整理', save: '儲存',
    cancel: '取消', delete: '刪除', search: '搜尋', filter: '篩選',
    language: '語言', theme: '主題',
  },
  ja: {
    dashboard: 'ダッシュボード', users: 'ユーザー', drivers: 'ドライバー', rides: '乗車',
    orders: '注文', payments: '支払い', reports: 'レポート', settings: '設定',
    signIn: 'ログイン', signOut: 'ログアウト', loading: '読み込み中…', error: 'エラー',
    approve: '承認', suspend: '停止', refresh: '更新', save: '保存',
    cancel: 'キャンセル', delete: '削除', search: '検索', filter: 'フィルター',
    language: '言語', theme: 'テーマ',
  },
  ko: {
    dashboard: '대시보드', users: '사용자', drivers: '드라이버', rides: '탑승',
    orders: '주문', payments: '결제', reports: '보고서', settings: '설정',
    signIn: '로그인', signOut: '로그아웃', loading: '로딩 중…', error: '오류',
    approve: '승인', suspend: '정지', refresh: '새로고침', save: '저장',
    cancel: '취소', delete: '삭제', search: '검색', filter: '필터',
    language: '언어', theme: '테마',
  },
  ar: {
    dashboard: 'لوحة التحكم', users: 'المستخدمون', drivers: 'السائقون', rides: 'الرحلات',
    orders: 'الطلبات', payments: 'المدفوعات', reports: 'التقارير', settings: 'الإعدادات',
    signIn: 'تسجيل الدخول', signOut: 'تسجيل الخروج', loading: 'جارٍ التحميل…', error: 'خطأ',
    approve: 'موافقة', suspend: 'تعليق', refresh: 'تحديث', save: 'حفظ',
    cancel: 'إلغاء', delete: 'حذف', search: 'بحث', filter: 'تصفية',
    language: 'اللغة', theme: 'السمة',
  },
  hi: {
    dashboard: 'डैशबोर्ड', users: 'उपयोगकर्ता', drivers: 'चालक', rides: 'सवारियाँ',
    orders: 'ऑर्डर', payments: 'भुगतान', reports: 'रिपोर्ट', settings: 'सेटिंग्स',
    signIn: 'साइन इन', signOut: 'साइन आउट', loading: 'लोड हो रहा है…', error: 'त्रुटि',
    approve: 'स्वीकृत करें', suspend: 'निलंबित करें', refresh: 'ताज़ा करें', save: 'सहेजें',
    cancel: 'रद्द करें', delete: 'हटाएं', search: 'खोजें', filter: 'फ़िल्टर',
    language: 'भाषा', theme: 'थीम',
  },
  th: {
    dashboard: 'แดชบอร์ด', users: 'ผู้ใช้', drivers: 'ผู้ขับ', rides: 'การเดินทาง',
    orders: 'คำสั่งซื้อ', payments: 'การชำระเงิน', reports: 'รายงาน', settings: 'การตั้งค่า',
    signIn: 'เข้าสู่ระบบ', signOut: 'ออกจากระบบ', loading: 'กำลังโหลด…', error: 'ข้อผิดพลาด',
    approve: 'อนุมัติ', suspend: 'ระงับ', refresh: 'รีเฟรช', save: 'บันทึก',
    cancel: 'ยกเลิก', delete: 'ลบ', search: 'ค้นหา', filter: 'กรอง',
    language: 'ภาษา', theme: 'ธีม',
  },
  tr: {
    dashboard: 'Gösterge Paneli', users: 'Kullanıcılar', drivers: 'Sürücüler', rides: 'Yolculuklar',
    orders: 'Siparişler', payments: 'Ödemeler', reports: 'Raporlar', settings: 'Ayarlar',
    signIn: 'Giriş yap', signOut: 'Çıkış yap', loading: 'Yükleniyor…', error: 'Hata',
    approve: 'Onayla', suspend: 'Askıya al', refresh: 'Yenile', save: 'Kaydet',
    cancel: 'İptal', delete: 'Sil', search: 'Ara', filter: 'Filtrele',
    language: 'Dil', theme: 'Tema',
  },
  vi: {
    dashboard: 'Bảng điều khiển', users: 'Người dùng', drivers: 'Tài xế', rides: 'Chuyến đi',
    orders: 'Đơn hàng', payments: 'Thanh toán', reports: 'Báo cáo', settings: 'Cài đặt',
    signIn: 'Đăng nhập', signOut: 'Đăng xuất', loading: 'Đang tải…', error: 'Lỗi',
    approve: 'Phê duyệt', suspend: 'Đình chỉ', refresh: 'Làm mới', save: 'Lưu',
    cancel: 'Hủy', delete: 'Xóa', search: 'Tìm kiếm', filter: 'Lọc',
    language: 'Ngôn ngữ', theme: 'Chủ đề',
  },
  id: {
    dashboard: 'Dasbor', users: 'Pengguna', drivers: 'Pengemudi', rides: 'Perjalanan',
    orders: 'Pesanan', payments: 'Pembayaran', reports: 'Laporan', settings: 'Pengaturan',
    signIn: 'Masuk', signOut: 'Keluar', loading: 'Memuat…', error: 'Kesalahan',
    approve: 'Setujui', suspend: 'Tangguhkan', refresh: 'Segarkan', save: 'Simpan',
    cancel: 'Batal', delete: 'Hapus', search: 'Cari', filter: 'Saring',
    language: 'Bahasa', theme: 'Tema',
  },
  nl: {
    dashboard: 'Dashboard', users: 'Gebruikers', drivers: 'Bestuurders', rides: 'Ritten',
    orders: 'Bestellingen', payments: 'Betalingen', reports: 'Rapporten', settings: 'Instellingen',
    signIn: 'Inloggen', signOut: 'Uitloggen', loading: 'Laden…', error: 'Fout',
    approve: 'Goedkeuren', suspend: 'Opschorten', refresh: 'Vernieuwen', save: 'Opslaan',
    cancel: 'Annuleren', delete: 'Verwijderen', search: 'Zoeken', filter: 'Filteren',
    language: 'Taal', theme: 'Thema',
  },
  pl: {
    dashboard: 'Panel', users: 'Użytkownicy', drivers: 'Kierowcy', rides: 'Przejazdy',
    orders: 'Zamówienia', payments: 'Płatności', reports: 'Raporty', settings: 'Ustawienia',
    signIn: 'Zaloguj się', signOut: 'Wyloguj się', loading: 'Ładowanie…', error: 'Błąd',
    approve: 'Zatwierdź', suspend: 'Zawieś', refresh: 'Odśwież', save: 'Zapisz',
    cancel: 'Anuluj', delete: 'Usuń', search: 'Szukaj', filter: 'Filtruj',
    language: 'Język', theme: 'Motyw',
  },
  sv: {
    dashboard: 'Instrumentpanel', users: 'Användare', drivers: 'Förare', rides: 'Resor',
    orders: 'Beställningar', payments: 'Betalningar', reports: 'Rapporter', settings: 'Inställningar',
    signIn: 'Logga in', signOut: 'Logga ut', loading: 'Laddar…', error: 'Fel',
    approve: 'Godkänn', suspend: 'Stäng av', refresh: 'Uppdatera', save: 'Spara',
    cancel: 'Avbryt', delete: 'Ta bort', search: 'Sök', filter: 'Filtrera',
    language: 'Språk', theme: 'Tema',
  },
};

type LocaleValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  t: (key: string) => string;
  isRTL: boolean;
};
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
  approveDriver: (userId: string, approved: boolean, notes?: string, checklist?: string[]) => Promise<void>;
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
const LocaleContext = createContext<LocaleValue | null>(null);

function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    if (typeof window === 'undefined') return DEFAULT_LOCALE;
    const stored = window.localStorage.getItem(LOCALE_KEY);
    return (stored && SUPPORTED_LOCALES.includes(stored as LocaleCode) ? stored as LocaleCode : DEFAULT_LOCALE);
  });

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    window.localStorage.setItem(LOCALE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string) => translations[locale]?.[key] ?? translations[DEFAULT_LOCALE]?.[key] ?? key,
    [locale],
  );

  const isRTL = RTL_LOCALES.has(locale);
  const value = useMemo(() => ({ locale, setLocale, t, isRTL }), [locale, setLocale, t, isRTL]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

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
    approveDriver: (userId, approved, notes, checklist) => run(() => adminApi.approveDriver(session!.accessToken, userId, approved, notes, checklist)),
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
      <LocaleProvider>
        <AuthProvider>
          <AdminProvider>{children}</AdminProvider>
        </AuthProvider>
      </LocaleProvider>
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

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('Locale context missing');
  return context;
}
