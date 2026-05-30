import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { PassengerScreen } from '../../../src/components/ui/PassengerScreen';

export default function PassengerSettingsScreen() {
  const router = useRouter();

  return (
    <PassengerScreen title="Settings" subtitle="Language, notifications, theme, and help.">
      <Pressable onPress={() => router.push('/(drawer)/accessibility-options')} accessibilityRole="button">
        <Text className="font-semibold text-emerald-400">Accessibility Options</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(drawer)/support')} accessibilityRole="button">
        <Text className="mt-3 font-semibold text-emerald-400">Support / Help</Text>
      </Pressable>
    </PassengerScreen>
  );
}
