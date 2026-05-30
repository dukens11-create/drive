import { Text, View } from 'react-native';

import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';

export default function EarningsScreen() {
  const { metrics, isLoading, error } = useDriveRealtime();

  return (
    <View className="flex-1 bg-zinc-50 p-4 dark:bg-zinc-950">
      {isLoading ? <Text className="mb-3 text-sm text-zinc-500 dark:text-zinc-300">Loading earnings…</Text> : null}
      {error ? <Text className="mb-3 text-sm text-rose-500 dark:text-rose-300">{error}</Text> : null}
      <View className="rounded-3xl bg-white p-5 shadow-soft dark:bg-zinc-900">
        <Text className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-300">Today net earnings</Text>
        <Text className="mt-2 text-4xl font-bold text-zinc-900 dark:text-zinc-100">${metrics.earningsToday.toFixed(2)}</Text>
        <Text className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">{metrics.tripsCompleted} paid rides across {metrics.hoursOnline.toFixed(1)} online hours.</Text>
      </View>
    </View>
  );
}
