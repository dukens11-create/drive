import * as SecureStore from 'expo-secure-store';

import { defaultLocale, supportedLocales, type SupportedLocale } from '../../i18n/translations';

const LOCALE_KEY = 'drive.locale';

const localeSet = new Set<SupportedLocale>(supportedLocales);

const isSupportedLocale = (locale: string): locale is SupportedLocale => localeSet.has(locale as SupportedLocale);

export const localeStorage = {
  async load(): Promise<SupportedLocale> {
    const stored = await SecureStore.getItemAsync(LOCALE_KEY);
    if (!stored || !isSupportedLocale(stored)) {
      return defaultLocale;
    }
    return stored;
  },

  async save(locale: SupportedLocale) {
    await SecureStore.setItemAsync(LOCALE_KEY, locale);
  },
};
