import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Switch, Text, View } from 'react-native';

import { useDriveRealtime } from '../../context/DriveRealtimeContext';
import { driverStatusMeta } from '../../utils/driveStatus';

export const TopOverlay = () => {
  const { profile, activeTrip, setOnline, error, onboardingRequired } = useDriveRealtime();
  const statusMeta = driverStatusMeta[profile.status];

  return (
    <View className="absolute left-4 right-4 top-14 z-20">
      {/* Main driver card */}
      <View className="flex-row items-center rounded-3xl bg-white/95 px-4 py-3 shadow-soft dark:bg-zinc-900/95">
        <Image
          source={profile.avatarUrl ? { uri: profile.avatarUrl } : require('../../../assets/icon.png')}
          className="h-10 w-10 rounded-full"
        />

        <View className="ml-3 flex-1">
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: statusMeta.accentColor }} />
            <Text className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">{profile.name}</Text>
          </View>
          <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400" numberOfLines={1}>
            {activeTrip ? `${activeTrip.pickupAddress} → ${activeTrip.dropoffAddress}` : statusMeta.label}
          </Text>
        </View>

        <View className="ml-2 items-center">
          <Text className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {profile.isOnline ? 'Online' : 'Offline'}
          </Text>
          <Switch
            value={profile.isOnline}
            onValueChange={(value) => void setOnline(value)}
            trackColor={{ false: '#A1A1AA', true: '#22C55E' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Pressable className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Ionicons name="notifications-outline" size={18} color={profile.isOnline ? '#0f172a' : '#6b7280'} />
        </Pressable>
      </View>

      {/* Error / onboarding banner */}
      {(error || onboardingRequired) ? (
        <View className="mt-2 flex-row items-center gap-2 rounded-2xl bg-rose-500/90 px-4 py-2">
          <Ionicons name="alert-circle-outline" size={14} color="#FFFFFF" />
          <Text className="flex-1 text-xs font-medium text-white">
            {error || 'Finish onboarding to unlock online mode.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
