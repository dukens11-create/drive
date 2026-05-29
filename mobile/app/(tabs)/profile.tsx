import { Text, View } from 'react-native';

import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';

export default function ProfileScreen() {
  const { profile } = useDriveRealtime();

  return (
    <View className="flex-1 bg-zinc-50 p-4 dark:bg-zinc-950">
      <View className="rounded-3xl bg-white p-5 shadow-soft dark:bg-zinc-900">
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{profile.name}</Text>
        <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Status: {profile.status}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Vehicle health: {profile.vehicleStatus === 'good' ? 'Good to drive' : 'Service soon'}</Text>
      </View>
    </View>
  );
}
