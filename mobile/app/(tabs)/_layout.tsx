import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

import { useAuth } from '../../src/context/AuthContext';
import { useLocale } from '../../src/context/LocaleContext';

const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  trips: 'car',
  earnings: 'cash',
  inbox: 'mail',
  profile: 'person',
};

export default function TabLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { state, onboardingStep } = useAuth();
  const { t } = useLocale();

  if (state !== 'signed_in') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (onboardingStep !== 'ready') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#16A34A',
        tabBarInactiveTintColor: isDark ? '#A1A1AA' : '#52525B',
        tabBarStyle: {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderTopColor: isDark ? '#27272A' : '#E4E4E7',
          height: 72,
          paddingTop: 10,
          paddingBottom: 10,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => <Ionicons name={iconByRoute[route.name]} size={size} color={color} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: t('common.home') }} />
      <Tabs.Screen name="trips" options={{ title: t('common.trips') }} />
      <Tabs.Screen name="earnings" options={{ title: t('common.earnings') }} />
      <Tabs.Screen name="inbox" options={{ title: t('common.inbox') }} />
      <Tabs.Screen name="profile" options={{ title: t('common.profile') }} />
    </Tabs>
  );
}
