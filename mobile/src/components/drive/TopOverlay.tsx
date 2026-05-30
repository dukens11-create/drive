import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Switch, Text, View } from 'react-native';

import { useDriveRealtime } from '../../context/DriveRealtimeContext';
import { useLocale } from '../../context/LocaleContext';
import { logDriverError } from '../../services/monitoring/telemetry';
import { driverStatusMeta } from '../../utils/driveStatus';

export const TopOverlay = () => {
  const router = useRouter();
  const { profile, activeRequest, activeTrip, requestTimeLeft, setOnline, error, onboardingRequired } = useDriveRealtime();
  const { t } = useLocale();
  const displayStatus = activeTrip?.status ?? profile.status;
  const statusMeta = driverStatusMeta[displayStatus];
  const statusLabel = activeRequest && !activeTrip ? 'Incoming request' : statusMeta.label;
  const statusSubtitle = activeTrip
    ? `${activeTrip.pickupAddress} → ${activeTrip.dropoffAddress}`
    : activeRequest
      ? `Respond in ${requestTimeLeft}s · ${activeRequest.pickupAddress}`
      : statusMeta.subtitle;
  const accentColor = activeRequest && !activeTrip ? '#F43F5E' : statusMeta.accentColor;

  return (
    <View className="absolute left-4 right-4 top-14 z-20">
      {/* Main driver card */}
      <View className="flex-row items-center rounded-3xl bg-white/95 px-4 py-3 shadow-soft dark:bg-zinc-900/95">
        <Image
          source={profile.avatarUrl ? { uri: profile.avatarUrl } : require('../../../assets/icon.png')}
          className="h-12 w-12 rounded-full"
        />

        <View className="ml-3 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">{profile.name}</Text>
          </View>
          <View className="mt-1 flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
            <Text className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{statusLabel}</Text>
          </View>
          <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300" numberOfLines={1}>
            {statusSubtitle}
          </Text>
        </View>

        <View className="ml-2 items-center">
          <Text className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {profile.isOnline ? t('common.online') : t('common.offline')}
          </Text>
          <Switch
            value={profile.isOnline}
            onValueChange={(value) => void setOnline(value)}
            trackColor={{ false: '#A1A1AA', true: '#22C55E' }}
            thumbColor="#FFFFFF"
            accessibilityLabel={profile.isOnline ? 'Go offline' : 'Go online'}
            accessibilityHint="Toggles your driver availability for incoming ride requests"
          />
        </View>

        <Pressable
          className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800"
          onPress={() => {
            try {
              router.push('/(tabs)/inbox');
            } catch (err) {
              logDriverError('open_inbox', err);
            }
          }}
          accessibilityRole="button"
          accessibilityLabel="Open inbox"
          accessibilityHint="View notifications and support updates"
          hitSlop={8}
        >
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
