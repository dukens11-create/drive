describe('apiConfig', () => {
  const originalApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  afterEach(() => {
    jest.resetModules();
    jest.unmock('expo-constants');

    if (originalApiBaseUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_BASE_URL;
    } else {
      process.env.EXPO_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    }

    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  test('uses expo extra api base url and trims trailing slash', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {
            apiBaseUrl: 'http://localhost:8080/',
          },
        },
      },
    }));

    const { apiBaseUrl } = require('../../src/services/config/apiConfig');

    expect(apiBaseUrl).toBe('http://localhost:8080');
  });

  test('falls back to localhost:8080 during development when config is missing', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;

    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {},
        },
      },
    }));

    const { apiBaseUrl } = require('../../src/services/config/apiConfig');

    expect(apiBaseUrl).toBe('http://localhost:8080');
  });

  test('throws in production when api base url is missing', () => {
    delete process.env.EXPO_PUBLIC_API_BASE_URL;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;

    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: {
        expoConfig: {
          extra: {},
        },
      },
    }));

    expect(() => require('../../src/services/config/apiConfig')).toThrow(
      'Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL or expo.extra.apiBaseUrl.'
    );
  });
});
