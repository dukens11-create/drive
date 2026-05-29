import { Pressable, Text, View } from 'react-native';

import { useDriveRealtime } from '../../context/DriveRealtimeContext';

export const RideRequestCard = () => {
  const { activeRequest, requestTimeLeft, acceptRequest, declineRequest } = useDriveRealtime();

  if (!activeRequest) {
    return null;
  }

  return (
    <View className="absolute bottom-80 left-4 right-4 z-30 rounded-3xl bg-white p-4 shadow-soft dark:bg-zinc-900">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-base font-semibold text-zinc-950 dark:text-zinc-100">{activeRequest.riderName}</Text>
          <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{activeRequest.pickupAddress}</Text>
          <Text className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {activeRequest.distanceKm} km away · ${activeRequest.estimatedFare.toFixed(2)} est
          </Text>
        </View>
        <View className="rounded-full bg-rose-100 px-3 py-1.5 dark:bg-rose-900/40">
          <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">{requestTimeLeft}s</Text>
        </View>
      </View>

      <View className="mt-4 flex-row gap-3">
        <Pressable className="flex-1 rounded-2xl bg-zinc-200 px-4 py-3 dark:bg-zinc-800" onPress={declineRequest}>
          <Text className="text-center font-semibold text-zinc-800 dark:text-zinc-100">Decline</Text>
        </Pressable>
        <Pressable className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3" onPress={acceptRequest}>
          <Text className="text-center font-semibold text-white">Accept</Text>
        </Pressable>
      </View>
    </View>
  );
};
