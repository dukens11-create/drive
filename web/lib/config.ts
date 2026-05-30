export const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '').replace(/\/$/, '');
export const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
export const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || '';
export const enableApiLogs = process.env.NEXT_PUBLIC_ENABLE_API_LOGS === 'true';
export const apiReady = Boolean(apiBaseUrl);
