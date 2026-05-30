import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { PassengerScreen } from '../../../src/components/ui/PassengerScreen';

export default function PassengerProfileScreen() {
  const router = useRouter();

  return (
    <PassengerScreen title="Profile" subtitle="Passenger info, saved addresses, and payment methods.">
      <Text className="text-zinc-100">Passenger: Demo Rider</Text>
      <Pressable onPress={() => router.push('/(drawer)/saved-locations')} accessibilityRole="button">
        <Text className="mt-3 font-semibold text-emerald-400">Saved Addresses</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(drawer)/payment-methods')} accessibilityRole="button">
        <Text className="mt-3 font-semibold text-emerald-400">Payment Methods</Text>
      </Pressable>
    </PassengerScreen>
  );
}
