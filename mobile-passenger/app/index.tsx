import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../src/context/AuthContext';

export default function IndexScreen() {
  const { state, isOnboardingLoading, onboardingStep } = useAuth();

  if (state === 'loading' || isOnboardingLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950">
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  if (state !== 'signed_in') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (onboardingStep !== 'ready') {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(drawer)/(tabs)/dashboard" />;
}
