import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Pressable, Text } from 'react-native';

import { usePassengerStore } from '../../src/store/passengerStore';

export default function ScheduledRidesScreen() {
  const scheduledRideCount = usePassengerStore((state) => state.scheduledRideCount);
  const incrementScheduledRide = usePassengerStore((state) => state.incrementScheduledRide);

  return (
    <PassengerScreen title="Scheduled Rides" subtitle="Book rides in advance.">
      <Text className="text-zinc-200">Scheduled rides: {scheduledRideCount}</Text>
      <Pressable onPress={incrementScheduledRide} accessibilityRole="button">
        <Text className="mt-3 font-semibold text-emerald-400">Schedule another ride</Text>
      </Pressable>
    </PassengerScreen>
  );
}
