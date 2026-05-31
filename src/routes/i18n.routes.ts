import { Router } from 'express';
import { getTranslations, isRTL, isSupportedLocale, resolveLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE, RTL_LOCALES } from '../i18n';

export const i18nRoutes = Router();

/**
 * GET /api/i18n/locales
 * Returns the list of supported locale codes, the default locale, and RTL locales.
 */
i18nRoutes.get('/locales', (_req, res) => {
  res.json({
    locales: SUPPORTED_LOCALES,
    default: DEFAULT_LOCALE,
    rtl: [...RTL_LOCALES],
  });
});

/**
 * GET /api/i18n/translations/:locale
 * Returns all translations for the requested locale.
 * Falls back to Accept-Language header if :locale is "auto".
 */
i18nRoutes.get('/translations/:locale', (req, res) => {
  const { locale: localeParam } = req.params;

  const locale =
    localeParam === 'auto'
      ? resolveLocale(req.headers['accept-language'])
      : isSupportedLocale(localeParam)
        ? localeParam
        : null;

  if (!locale) {
    res.status(400).json({ error: `Unsupported locale: ${localeParam}` });
    return;
  }

  const translations = getTranslations(locale);
  res.json({ locale, translations, isRTL: isRTL(locale) });
});
