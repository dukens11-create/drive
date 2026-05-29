import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DriveRealtimeProvider } from '../src/context/DriveRealtimeContext';

export default function RootLayout() {
  return (
    <DriveRealtimeProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </DriveRealtimeProvider>
  );
}
