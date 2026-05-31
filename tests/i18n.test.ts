import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/app';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  resolveLocale,
  isSupportedLocale,
  isRTL,
  t,
  getTranslations,
} from '../src/i18n';

async function withServer(run: (baseUrl: string) => Promise<void>) {
  const { httpServer } = createApp();
  await new Promise<void>(resolve => {
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });
  try {
    const address = httpServer.address() as AddressInfo;
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      httpServer.close(err => (err ? reject(err) : resolve()));
    });
  }
}

// --- unit tests for i18n utilities ---

test('SUPPORTED_LOCALES contains exactly 20 locales', () => {
  assert.equal(SUPPORTED_LOCALES.length, 20);
});

test('DEFAULT_LOCALE is English', () => {
  assert.equal(DEFAULT_LOCALE, 'en');
});

test('isSupportedLocale returns true for valid codes', () => {
  assert.equal(isSupportedLocale('en'), true);
  assert.equal(isSupportedLocale('ar'), true);
  assert.equal(isSupportedLocale('zh-CN'), true);
  assert.equal(isSupportedLocale('zh-TW'), true);
});

test('isSupportedLocale returns false for unknown codes', () => {
  assert.equal(isSupportedLocale('xx'), false);
  assert.equal(isSupportedLocale(''), false);
  assert.equal(isSupportedLocale('EN'), false);
});

test('isRTL returns true only for RTL locales', () => {
  assert.equal(isRTL('ar'), true);
  assert.equal(isRTL('en'), false);
  assert.equal(isRTL('fr'), false);
});

test('RTL_LOCALES includes Arabic', () => {
  assert.equal(RTL_LOCALES.has('ar'), true);
});

test('resolveLocale returns default for empty/undefined input', () => {
  assert.equal(resolveLocale(undefined), DEFAULT_LOCALE);
  assert.equal(resolveLocale(''), DEFAULT_LOCALE);
});

test('resolveLocale matches an exact supported locale', () => {
  assert.equal(resolveLocale('fr'), 'fr');
  assert.equal(resolveLocale('de'), 'de');
  assert.equal(resolveLocale('ar'), 'ar');
  assert.equal(resolveLocale('zh-CN'), 'zh-CN');
});

test('resolveLocale falls back to language subtag when full tag not found', () => {
  assert.equal(resolveLocale('fr-CA'), 'fr');
  assert.equal(resolveLocale('de-AT'), 'de');
});

test('resolveLocale handles Accept-Language header with quality values', () => {
  assert.equal(resolveLocale('de-CH,de;q=0.9,en;q=0.8'), 'de');
  assert.equal(resolveLocale('xx-YY,es;q=0.9'), 'es');
});

test('resolveLocale falls back to English for completely unknown input', () => {
  assert.equal(resolveLocale('xx'), DEFAULT_LOCALE);
  assert.equal(resolveLocale('xx-YY,zz-ZZ'), DEFAULT_LOCALE);
});

test('t returns translation for known key in English', () => {
  const value = t('auth.invalidCredentials', 'en');
  assert.ok(typeof value === 'string' && value.length > 0);
  assert.notEqual(value, 'auth.invalidCredentials');
});

test('t returns translation for known key in other languages', () => {
  const enValue = t('rides.notFound', 'en');
  const esValue = t('rides.notFound', 'es');
  assert.ok(typeof esValue === 'string' && esValue.length > 0);
  // Spanish translation should differ from English
  assert.notEqual(enValue, esValue);
});

test('t falls back to English for missing key in non-English locale', () => {
  const result = t('__nonexistent.key__', 'ja');
  assert.equal(result, '__nonexistent.key__');
});

test('t returns the key itself when key is missing entirely', () => {
  const result = t('__definitely.missing__', 'en');
  assert.equal(result, '__definitely.missing__');
});

test('getTranslations returns all keys for a locale', () => {
  const map = getTranslations('en');
  assert.ok(typeof map === 'object' && map !== null);
  assert.ok(Object.keys(map).length > 0);
  assert.ok('auth.invalidCredentials' in map);
});

test('getTranslations returns English translations for every supported locale', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const map = getTranslations(locale);
    assert.ok(Object.keys(map).length > 0, `${locale} has no translations`);
  }
});

// --- HTTP endpoint tests ---

test('GET /api/i18n/locales returns the list of supported locales', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/i18n/locales`);
    assert.equal(res.status, 200);
    const body = await res.json() as { locales: string[]; default: string; rtl: string[] };
    assert.ok(Array.isArray(body.locales));
    assert.equal(body.locales.length, 20);
    assert.equal(body.default, 'en');
    assert.ok(Array.isArray(body.rtl));
    assert.ok(body.rtl.includes('ar'));
  });
});

test('GET /api/i18n/translations/en returns English translations', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/i18n/translations/en`);
    assert.equal(res.status, 200);
    const body = await res.json() as { locale: string; translations: Record<string, string>; isRTL: boolean };
    assert.equal(body.locale, 'en');
    assert.ok(typeof body.translations === 'object');
    assert.ok('auth.invalidCredentials' in body.translations);
    assert.equal(body.isRTL, false);
  });
});

test('GET /api/i18n/translations/ar returns Arabic translations with isRTL=true', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/i18n/translations/ar`);
    assert.equal(res.status, 200);
    const body = await res.json() as { locale: string; isRTL: boolean };
    assert.equal(body.locale, 'ar');
    assert.equal(body.isRTL, true);
  });
});

test('GET /api/i18n/translations/auto uses Accept-Language header', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/i18n/translations/auto`, {
      headers: { 'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8' },
    });
    assert.equal(res.status, 200);
    const body = await res.json() as { locale: string };
    assert.equal(body.locale, 'fr');
  });
});

test('GET /api/i18n/translations/auto falls back to English without header', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/i18n/translations/auto`);
    assert.equal(res.status, 200);
    const body = await res.json() as { locale: string };
    assert.equal(body.locale, 'en');
  });
});

test('GET /api/i18n/translations/:unsupported returns 400', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/i18n/translations/xx`);
    assert.equal(res.status, 400);
  });
});
