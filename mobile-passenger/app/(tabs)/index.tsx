import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { LiveRideTracker } from '../../src/components/ride/LiveRideTracker';
import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';

export default function PassengerTabHome() {
  const router = useRouter();
  const { activeTrip, activeRequest, location, refreshData } = useDriveRealtime();

  return (
    <PassengerScreen title="Home" subtitle="Request rides and monitor active trips in real time.">
      <LiveRideTracker
        activeTrip={activeTrip}
        riderLocation={location}
        driverLocation={null}
        etaMinutes={activeTrip?.pickupEtaMinutes ?? activeRequest?.pickupEtaMinutes ?? 6}
        isConnecting={false}
        onRefresh={() => void refreshData()}
        onShareTrip={() => router.push('/(tabs)/ride/live')}
        onSendChat={async () => undefined}
      />
      <View className="mt-3 flex-row gap-2">
        <Pressable className="rounded-full bg-emerald-600 px-4 py-2" onPress={() => router.push('/(drawer)/ride-request')}>
          <Text className="font-semibold text-white">Request Ride</Text>
        </Pressable>
        <Pressable className="rounded-full bg-zinc-700 px-4 py-2" onPress={() => router.push('/(tabs)/ride/live')}>
          <Text className="font-semibold text-white">Open Live Tracking</Text>
        </Pressable>
      </View>
    </PassengerScreen>
  );
}
