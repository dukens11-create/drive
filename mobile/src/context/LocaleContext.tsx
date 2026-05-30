import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { defaultLocale, localeLabelByCode, supportedLocales, translations, type SupportedLocale } from '../i18n/translations';
import { localeStorage } from '../services/storage/localeStorage';

type LocaleContextValue = {
  locale: SupportedLocale;
  isRTL: boolean;
  localeLabel: string;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  formatCurrency: (value: number, currency?: string) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  t: (key: string, values?: Record<string, unknown>) => string;
};

const rtlLocales = new Set<SupportedLocale>(['ar']);
const supportedLocaleSet = new Set<SupportedLocale>(supportedLocales);

const resolveSupportedLocale = (localeValue: string | null | undefined): SupportedLocale => {
  if (!localeValue) {
    return defaultLocale;
  }

  const normalized = localeValue.toLowerCase();
  if (supportedLocaleSet.has(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }

  const languageCode = normalized.split('-')[0] as SupportedLocale;
  return supportedLocaleSet.has(languageCode) ? languageCode : defaultLocale;
};

const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = defaultLocale;

i18n.locale = defaultLocale;

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export const LocaleProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);

  useEffect(() => {
    let isActive = true;

    const hydrateLocale = async () => {
      const deviceLocale = resolveSupportedLocale(Localization.getLocales()[0]?.languageTag ?? null);
      const storedLocale = await localeStorage.load();
      const nextLocale = storedLocale || deviceLocale;

      if (!isActive) {
        return;
      }

      i18n.locale = nextLocale;
      setLocaleState(nextLocale);
    };

    void hydrateLocale();

    return () => {
      isActive = false;
    };
  }, []);

  const setLocale = useCallback(async (nextLocale: SupportedLocale) => {
    i18n.locale = nextLocale;
    setLocaleState(nextLocale);
    await localeStorage.save(nextLocale);
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      isRTL: rtlLocales.has(locale),
      localeLabel: localeLabelByCode[locale],
      setLocale,
      t: (key, values) => String(i18n.t(key, values)),
      formatCurrency: (value, currency = 'USD') => new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value),
      formatNumber: (value, options) => new Intl.NumberFormat(locale, options).format(value),
      formatDate: (value, options) => new Intl.DateTimeFormat(locale, options).format(new Date(value)),
      formatTime: (value, options) =>
        new Intl.DateTimeFormat(locale, {
          hour: 'numeric',
          minute: '2-digit',
          ...options,
        }).format(new Date(value)),
    }),
    [locale, setLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
};
