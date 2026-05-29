import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Switch, Text, View } from 'react-native';

import { useDriveRealtime } from '../../context/DriveRealtimeContext';
import { driverStatusMeta } from '../../utils/driveStatus';

export const TopOverlay = () => {
  const { profile, activeTrip, setOnline } = useDriveRealtime();
  const statusMeta = driverStatusMeta[profile.status];

  return (
    <View className="absolute left-4 right-4 top-14 z-20 rounded-3xl bg-white/92 p-4 shadow-soft dark:bg-zinc-900/92">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-3">
          <Image source={{ uri: profile.avatarUrl }} className="h-12 w-12 rounded-full" />
          <View className="flex-1">
            <Text className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">{profile.name}</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusMeta.accentColor }} />
              <Text className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{statusMeta.label}</Text>
            </View>
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">
              {activeTrip ? `${activeTrip.pickupAddress} → ${activeTrip.dropoffAddress}` : statusMeta.subtitle}
            </Text>
          </View>
        </View>

        <View className="items-end rounded-3xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
          <Text className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-300">
            {profile.isOnline ? 'Go Offline' : 'Go Online'}
          </Text>
          <Switch value={profile.isOnline} onValueChange={setOnline} trackColor={{ false: '#A1A1AA', true: '#22C55E' }} />
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-end">
        <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Ionicons name="notifications-outline" size={20} color={profile.isOnline ? '#0f172a' : '#6b7280'} />
        </Pressable>
      </View>
    </View>
  );
};
