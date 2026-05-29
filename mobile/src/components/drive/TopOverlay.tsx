import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Switch, Text, View } from 'react-native';

import { useDriveRealtime } from '../../context/DriveRealtimeContext';

const statusColors = {
  available: 'bg-emerald-500',
  'on-trip': 'bg-blue-500',
  break: 'bg-zinc-500',
};

const statusLabels = {
  available: 'Ready for rides',
  'on-trip': 'On trip',
  break: 'Offline break',
};

export const TopOverlay = () => {
  const { profile, setOnline } = useDriveRealtime();

  return (
    <View className="absolute left-4 right-4 top-14 z-20 rounded-3xl bg-white/92 p-4 shadow-soft dark:bg-zinc-900/92">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Image source={{ uri: profile.avatarUrl }} className="h-12 w-12 rounded-full" />
          <View>
            <Text className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">{profile.name}</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <View className={`h-2.5 w-2.5 rounded-full ${statusColors[profile.status]}`} />
              <Text className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{statusLabels[profile.status]}</Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center gap-2 rounded-full bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
          <Text className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">{profile.isOnline ? 'Online' : 'Offline'}</Text>
          <Switch value={profile.isOnline} onValueChange={setOnline} trackColor={{ true: '#22C55E' }} />
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
