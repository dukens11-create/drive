import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';

import { AccessibilityProvider } from '../src/context/AccessibilityContext';
import { AuthProvider } from '../src/context/AuthContext';
import { DriveRealtimeProvider } from '../src/context/DriveRealtimeContext';
import { LocaleProvider, useLocale } from '../src/context/LocaleContext';
import { logEvent, markAppStartupComplete, trackMemoryUsage } from '../src/services/observability';

const MEMORY_SAMPLE_INTERVAL_MS = 30000;

const AppNavigator = () => {
  const { isRTL } = useLocale();

  return (
    <View style={{ flex: 1, direction: isRTL ? 'rtl' : 'ltr' }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(drawer)" />
      </Stack>
    </View>
  );
};

export default function RootLayout() {
  useEffect(() => {
    markAppStartupComplete('root_layout_mounted');
    trackMemoryUsage('startup');
    const memoryInterval = setInterval(() => {
      trackMemoryUsage('heartbeat');
    }, MEMORY_SAMPLE_INTERVAL_MS);

    const subscription = AppState.addEventListener('change', (nextState) => {
      logEvent('app_state_changed', {
        state: nextState,
      });
      if (nextState === 'active') {
        trackMemoryUsage('app_active');
      }
    });

    return () => {
      clearInterval(memoryInterval);
      subscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LocaleProvider>
        <AuthProvider>
          <AccessibilityProvider>
            <DriveRealtimeProvider>
              <AppNavigator />
            </DriveRealtimeProvider>
          </AccessibilityProvider>
        </AuthProvider>
      </LocaleProvider>
    </GestureHandlerRootView>
  );
}
