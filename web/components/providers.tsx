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

export const SUPPORTED_LOCALES: LocaleCode[] = [
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru',
  'zh-CN', 'zh-TW', 'ja', 'ko', 'ar', 'hi',
  'th', 'tr', 'vi', 'id', 'nl', 'pl', 'sv',
];

export const LOCALE_LABELS: Record<LocaleCode, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  'zh-CN': '中文（简体）',
  'zh-TW': '中文（繁體）',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
  hi: 'हिन्दी',
  th: 'ภาษาไทย',
  tr: 'Türkçe',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  nl: 'Nederlands',
  pl: 'Polski',
  sv: 'Svenska',
};

export const RTL_LOCALES = new Set<LocaleCode>(['ar']);

const translations: Record<LocaleCode, Record<string, string>> = {
  en: {
    welcome: 'Passenger web command center',
    demo: 'Demo mode',
    connected: 'Connected mode',
    book: 'Book a ride',
    history: 'History',
    wallet: 'Wallet',
    support: 'Support',
    account: 'Account',
    signIn: 'Sign in',
    signOut: 'Sign out',
    language: 'Language',
    settings: 'Settings',
    loading: 'Loading…',
    retry: 'Retry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    close: 'Close',
    search: 'Search',
    noResults: 'No results',
    error: 'Something went wrong.',
  },
  es: {
    welcome: 'Centro web del pasajero',
    demo: 'Modo demo',
    connected: 'Modo conectado',
    book: 'Reservar un viaje',
    history: 'Historial',
    wallet: 'Billetera',
    support: 'Soporte',
    account: 'Cuenta',
    signIn: 'Iniciar sesión',
    signOut: 'Cerrar sesión',
    language: 'Idioma',
    settings: 'Configuración',
    loading: 'Cargando…',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Guardar',
    close: 'Cerrar',
    search: 'Buscar',
    noResults: 'Sin resultados',
    error: 'Algo salió mal.',
  },
  fr: {
    welcome: 'Centre web passager',
    demo: 'Mode démo',
    connected: 'Mode connecté',
    book: 'Réserver une course',
    history: 'Historique',
    wallet: 'Portefeuille',
    support: 'Assistance',
    account: 'Compte',
    signIn: 'Se connecter',
    signOut: 'Se déconnecter',
    language: 'Langue',
    settings: 'Paramètres',
    loading: 'Chargement…',
    retry: 'Réessayer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    save: 'Enregistrer',
    close: 'Fermer',
    search: 'Rechercher',
    noResults: 'Aucun résultat',
    error: "Une erreur s'est produite.",
  },
  de: {
    welcome: 'Passagier-Webzentrale',
    demo: 'Demo-Modus',
    connected: 'Verbundener Modus',
    book: 'Fahrt buchen',
    history: 'Verlauf',
    wallet: 'Wallet',
    support: 'Support',
    account: 'Konto',
    signIn: 'Anmelden',
    signOut: 'Abmelden',
    language: 'Sprache',
    settings: 'Einstellungen',
    loading: 'Laden…',
    retry: 'Erneut versuchen',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    save: 'Speichern',
    close: 'Schließen',
    search: 'Suchen',
    noResults: 'Keine Ergebnisse',
    error: 'Etwas ist schiefgelaufen.',
  },
  it: {
    welcome: 'Centro web passeggero',
    demo: 'Modalità demo',
    connected: 'Modalità connessa',
    book: 'Prenota una corsa',
    history: 'Cronologia',
    wallet: 'Portafoglio',
    support: 'Supporto',
    account: 'Account',
    signIn: 'Accedi',
    signOut: 'Esci',
    language: 'Lingua',
    settings: 'Impostazioni',
    loading: 'Caricamento…',
    retry: 'Riprova',
    cancel: 'Annulla',
    confirm: 'Conferma',
    save: 'Salva',
    close: 'Chiudi',
    search: 'Cerca',
    noResults: 'Nessun risultato',
    error: 'Qualcosa è andato storto.',
  },
  pt: {
    welcome: 'Central web do passageiro',
    demo: 'Modo demo',
    connected: 'Modo conectado',
    book: 'Reservar uma corrida',
    history: 'Histórico',
    wallet: 'Carteira',
    support: 'Suporte',
    account: 'Conta',
    signIn: 'Entrar',
    signOut: 'Sair',
    language: 'Idioma',
    settings: 'Configurações',
    loading: 'Carregando…',
    retry: 'Tentar novamente',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Salvar',
    close: 'Fechar',
    search: 'Pesquisar',
    noResults: 'Sem resultados',
    error: 'Algo deu errado.',
  },
  ru: {
    welcome: 'Веб-центр пассажира',
    demo: 'Демо-режим',
    connected: 'Режим подключения',
    book: 'Заказать поездку',
    history: 'История',
    wallet: 'Кошелёк',
    support: 'Поддержка',
    account: 'Аккаунт',
    signIn: 'Войти',
    signOut: 'Выйти',
    language: 'Язык',
    settings: 'Настройки',
    loading: 'Загрузка…',
    retry: 'Повторить',
    cancel: 'Отмена',
    confirm: 'Подтвердить',
    save: 'Сохранить',
    close: 'Закрыть',
    search: 'Поиск',
    noResults: 'Нет результатов',
    error: 'Что-то пошло не так.',
  },
  'zh-CN': {
    welcome: '乘客网页控制中心',
    demo: '演示模式',
    connected: '连接模式',
    book: '预约行程',
    history: '历史记录',
    wallet: '钱包',
    support: '客服支持',
    account: '账号',
    signIn: '登录',
    signOut: '退出登录',
    language: '语言',
    settings: '设置',
    loading: '加载中…',
    retry: '重试',
    cancel: '取消',
    confirm: '确认',
    save: '保存',
    close: '关闭',
    search: '搜索',
    noResults: '无结果',
    error: '出了点问题。',
  },
  'zh-TW': {
    welcome: '乘客網頁控制中心',
    demo: '示範模式',
    connected: '連線模式',
    book: '預約行程',
    history: '歷史紀錄',
    wallet: '錢包',
    support: '客服支援',
    account: '帳號',
    signIn: '登入',
    signOut: '登出',
    language: '語言',
    settings: '設定',
    loading: '載入中…',
    retry: '重試',
    cancel: '取消',
    confirm: '確認',
    save: '儲存',
    close: '關閉',
    search: '搜尋',
    noResults: '無結果',
    error: '發生錯誤。',
  },
  ja: {
    welcome: '乗客ウェブセンター',
    demo: 'デモモード',
    connected: '接続モード',
    book: '乗車予約',
    history: '履歴',
    wallet: 'ウォレット',
    support: 'サポート',
    account: 'アカウント',
    signIn: 'ログイン',
    signOut: 'ログアウト',
    language: '言語',
    settings: '設定',
    loading: '読み込み中…',
    retry: '再試行',
    cancel: 'キャンセル',
    confirm: '確認',
    save: '保存',
    close: '閉じる',
    search: '検索',
    noResults: '結果なし',
    error: '問題が発生しました。',
  },
  ko: {
    welcome: '승객 웹 센터',
    demo: '데모 모드',
    connected: '연결 모드',
    book: '탑승 예약',
    history: '이용 내역',
    wallet: '지갑',
    support: '고객 지원',
    account: '계정',
    signIn: '로그인',
    signOut: '로그아웃',
    language: '언어',
    settings: '설정',
    loading: '로딩 중…',
    retry: '다시 시도',
    cancel: '취소',
    confirm: '확인',
    save: '저장',
    close: '닫기',
    search: '검색',
    noResults: '결과 없음',
    error: '문제가 발생했습니다.',
  },
  ar: {
    welcome: 'مركز الويب للركاب',
    demo: 'وضع العرض',
    connected: 'الوضع المتصل',
    book: 'احجز رحلة',
    history: 'السجل',
    wallet: 'المحفظة',
    support: 'الدعم',
    account: 'الحساب',
    signIn: 'تسجيل الدخول',
    signOut: 'تسجيل الخروج',
    language: 'اللغة',
    settings: 'الإعدادات',
    loading: 'جارٍ التحميل…',
    retry: 'إعادة المحاولة',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    save: 'حفظ',
    close: 'إغلاق',
    search: 'بحث',
    noResults: 'لا توجد نتائج',
    error: 'حدث خطأ ما.',
  },
  hi: {
    welcome: 'यात्री वेब केंद्र',
    demo: 'डेमो मोड',
    connected: 'कनेक्टेड मोड',
    book: 'राइड बुक करें',
    history: 'इतिहास',
    wallet: 'वॉलेट',
    support: 'सहायता',
    account: 'खाता',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    language: 'भाषा',
    settings: 'सेटिंग्स',
    loading: 'लोड हो रहा है…',
    retry: 'पुनः प्रयास',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    save: 'सहेजें',
    close: 'बंद करें',
    search: 'खोजें',
    noResults: 'कोई परिणाम नहीं',
    error: 'कुछ गलत हो गया।',
  },
  th: {
    welcome: 'ศูนย์เว็บผู้โดยสาร',
    demo: 'โหมดสาธิต',
    connected: 'โหมดเชื่อมต่อ',
    book: 'จองการเดินทาง',
    history: 'ประวัติ',
    wallet: 'กระเป๋าเงิน',
    support: 'ช่วยเหลือ',
    account: 'บัญชี',
    signIn: 'เข้าสู่ระบบ',
    signOut: 'ออกจากระบบ',
    language: 'ภาษา',
    settings: 'การตั้งค่า',
    loading: 'กำลังโหลด…',
    retry: 'ลองใหม่',
    cancel: 'ยกเลิก',
    confirm: 'ยืนยัน',
    save: 'บันทึก',
    close: 'ปิด',
    search: 'ค้นหา',
    noResults: 'ไม่พบผลลัพธ์',
    error: 'เกิดข้อผิดพลาด',
  },
  tr: {
    welcome: 'Yolcu web merkezi',
    demo: 'Demo modu',
    connected: 'Bağlı mod',
    book: 'Yolculuk rezervasyonu',
    history: 'Geçmiş',
    wallet: 'Cüzdan',
    support: 'Destek',
    account: 'Hesap',
    signIn: 'Giriş yap',
    signOut: 'Çıkış yap',
    language: 'Dil',
    settings: 'Ayarlar',
    loading: 'Yükleniyor…',
    retry: 'Tekrar dene',
    cancel: 'İptal',
    confirm: 'Onayla',
    save: 'Kaydet',
    close: 'Kapat',
    search: 'Ara',
    noResults: 'Sonuç yok',
    error: 'Bir şeyler ters gitti.',
  },
  vi: {
    welcome: 'Trung tâm web hành khách',
    demo: 'Chế độ demo',
    connected: 'Chế độ kết nối',
    book: 'Đặt chuyến đi',
    history: 'Lịch sử',
    wallet: 'Ví',
    support: 'Hỗ trợ',
    account: 'Tài khoản',
    signIn: 'Đăng nhập',
    signOut: 'Đăng xuất',
    language: 'Ngôn ngữ',
    settings: 'Cài đặt',
    loading: 'Đang tải…',
    retry: 'Thử lại',
    cancel: 'Hủy',
    confirm: 'Xác nhận',
    save: 'Lưu',
    close: 'Đóng',
    search: 'Tìm kiếm',
    noResults: 'Không có kết quả',
    error: 'Đã xảy ra lỗi.',
  },
  id: {
    welcome: 'Pusat web penumpang',
    demo: 'Mode demo',
    connected: 'Mode terhubung',
    book: 'Pesan perjalanan',
    history: 'Riwayat',
    wallet: 'Dompet',
    support: 'Dukungan',
    account: 'Akun',
    signIn: 'Masuk',
    signOut: 'Keluar',
    language: 'Bahasa',
    settings: 'Pengaturan',
    loading: 'Memuat…',
    retry: 'Coba lagi',
    cancel: 'Batal',
    confirm: 'Konfirmasi',
    save: 'Simpan',
    close: 'Tutup',
    search: 'Cari',
    noResults: 'Tidak ada hasil',
    error: 'Terjadi kesalahan.',
  },
  nl: {
    welcome: 'Passagier webcentrum',
    demo: 'Demomodus',
    connected: 'Verbonden modus',
    book: 'Rit boeken',
    history: 'Geschiedenis',
    wallet: 'Portemonnee',
    support: 'Ondersteuning',
    account: 'Account',
    signIn: 'Aanmelden',
    signOut: 'Afmelden',
    language: 'Taal',
    settings: 'Instellingen',
    loading: 'Laden…',
    retry: 'Opnieuw proberen',
    cancel: 'Annuleren',
    confirm: 'Bevestigen',
    save: 'Opslaan',
    close: 'Sluiten',
    search: 'Zoeken',
    noResults: 'Geen resultaten',
    error: 'Er is iets misgegaan.',
  },
  pl: {
    welcome: 'Centrum webowe pasażera',
    demo: 'Tryb demo',
    connected: 'Tryb połączony',
    book: 'Zarezerwuj przejazd',
    history: 'Historia',
    wallet: 'Portfel',
    support: 'Wsparcie',
    account: 'Konto',
    signIn: 'Zaloguj się',
    signOut: 'Wyloguj się',
    language: 'Język',
    settings: 'Ustawienia',
    loading: 'Ładowanie…',
    retry: 'Spróbuj ponownie',
    cancel: 'Anuluj',
    confirm: 'Potwierdź',
    save: 'Zapisz',
    close: 'Zamknij',
    search: 'Szukaj',
    noResults: 'Brak wyników',
    error: 'Coś poszło nie tak.',
  },
  sv: {
    welcome: 'Passagerare webbcenter',
    demo: 'Demoläge',
    connected: 'Anslutet läge',
    book: 'Boka en resa',
    history: 'Historik',
    wallet: 'Plånbok',
    support: 'Support',
    account: 'Konto',
    signIn: 'Logga in',
    signOut: 'Logga ut',
    language: 'Språk',
    settings: 'Inställningar',
    loading: 'Laddar…',
    retry: 'Försök igen',
    cancel: 'Avbryt',
    confirm: 'Bekräfta',
    save: 'Spara',
    close: 'Stäng',
    search: 'Sök',
    noResults: 'Inga resultat',
    error: 'Något gick fel.',
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
  document.documentElement.lang = preferences.locale;
  document.documentElement.dir = RTL_LOCALES.has(preferences.locale) ? 'rtl' : 'ltr';
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
  return useCallback(
    (key: string) => translations[preferences.locale]?.[key] ?? translations['en']?.[key] ?? key,
    [preferences.locale],
  );
}
