import { Text, View } from 'react-native';

import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';

export default function TripsScreen() {
  const { rideHistory } = useDriveRealtime();

  return (
    <View className="flex-1 bg-zinc-50 p-4 dark:bg-zinc-950">
      {rideHistory.map((ride) => (
        <View key={ride.id} className="mb-3 rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{ride.riderName}</Text>
          <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">{ride.route}</Text>
          <Text className="mt-2 text-sm font-medium text-emerald-600">${ride.fare.toFixed(2)} · {ride.timeLabel}</Text>
        </View>
      ))}
    </View>
  );
}
