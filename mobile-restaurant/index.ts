import * as Notifications from 'expo-notifications';

import { logEvent, setupCrashReporting } from './src/services/observability';

setupCrashReporting();
logEvent('app_entry_initialized');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

import 'expo-router/entry';
