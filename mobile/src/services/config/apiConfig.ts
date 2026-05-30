import Constants from 'expo-constants';

type ExpoExtra = {
  apiBaseUrl?: string;
};

const expoExtra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
const runtimeApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!runtimeApiBaseUrl && !expoExtra.apiBaseUrl && !__DEV__) {
  throw new Error('Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL or expo.extra.apiBaseUrl.');
}

const fallbackApiBaseUrl = 'http://localhost:3000';

export const apiBaseUrl = (runtimeApiBaseUrl || expoExtra.apiBaseUrl || fallbackApiBaseUrl).replace(/\/$/, '');
