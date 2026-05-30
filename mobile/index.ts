import * as Notifications from 'expo-notifications';

// Registers the background location task definition before Expo Router boots the app.
import './src/services/background/locationTask';
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
