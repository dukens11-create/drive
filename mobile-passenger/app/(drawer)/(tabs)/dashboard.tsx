import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { PassengerScreen } from '../../../src/components/ui/PassengerScreen';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <PassengerScreen title="Home / Dashboard" subtitle="Ride request, location, and quick actions.">
      <Pressable onPress={() => router.push('/(drawer)/ride-request')} accessibilityRole="button">
        <Text className="font-semibold text-emerald-400">Request Ride</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(drawer)/live-ride-tracking')} accessibilityRole="button">
        <Text className="mt-3 font-semibold text-emerald-400">Live Ride Tracking</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(drawer)/scheduled-rides')} accessibilityRole="button">
        <Text className="mt-3 font-semibold text-emerald-400">Scheduled Rides</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(drawer)/saved-locations')} accessibilityRole="button">
        <Text className="mt-3 font-semibold text-emerald-400">Saved Locations</Text>
      </Pressable>
    </PassengerScreen>
  );
}
