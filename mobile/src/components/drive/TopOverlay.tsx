import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Pressable, Switch, Text, View } from 'react-native';

import { useAccessibilitySettings } from '../../context/AccessibilityContext';
import { useDriveRealtime } from '../../context/DriveRealtimeContext';
import { useLocale } from '../../context/LocaleContext';
import { logDriverError } from '../../services/monitoring/telemetry';
import { driverStatusMeta } from '../../utils/driveStatus';

const DEFAULT_TRUST_SCORE = 80;

export const TopOverlay = () => {
  const router = useRouter();
  const { profile, activeRequest, activeTrip, requestTimeLeft, setOnline, error, onboardingRequired, isOfflineMode } = useDriveRealtime();
  const { highContrastEnabled, maxFontSizeMultiplier } = useAccessibilitySettings();
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
      <View className={`flex-row items-center rounded-3xl px-4 py-3 shadow-soft ${highContrastEnabled ? 'border border-white bg-black' : 'bg-white/95 dark:bg-zinc-900/95'}`}>
        <Image
          source={profile.avatarUrl ? { uri: profile.avatarUrl } : require('../../../assets/icon.png')}
          className="h-12 w-12 rounded-full"
          accessibilityLabel={`${profile.name} profile picture`}
          accessible
        />

        <View className="ml-3 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className={`text-lg font-semibold ${highContrastEnabled ? 'text-white' : 'text-zinc-950 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{profile.name}</Text>
            {profile.verificationBadge === 'verified' ? (
              <View className={`rounded-full px-2 py-0.5 ${highContrastEnabled ? 'border border-white bg-black' : 'bg-emerald-100 dark:bg-emerald-900/40'}`}>
                <Text className={`text-[10px] font-semibold uppercase tracking-wide ${highContrastEnabled ? 'text-white' : 'text-emerald-600 dark:text-emerald-300'}`}>Verified</Text>
              </View>
            ) : null}
          </View>
          <View className="mt-1 flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentColor }} />
            <Text className={`text-xs font-medium ${highContrastEnabled ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{statusLabel}</Text>
          </View>
          <Text className={`mt-1 text-xs ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'}`} numberOfLines={1} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {statusSubtitle}
          </Text>
          <Text className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-300">
            Trust score {profile.trustScore ?? DEFAULT_TRUST_SCORE}
            {isOfflineMode ? ' · Offline cache active' : ''}
          </Text>
        </View>

        <View className="ml-2 items-center">
          <Text className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {profile.isOnline ? t('common.online') : t('common.offline')}
          </Text>
          <Switch
            value={profile.isOnline}
            onValueChange={(value) => void setOnline(value)}
            trackColor={{ false: '#A1A1AA', true: '#22C55E' }}
            thumbColor="#FFFFFF"
            accessibilityLabel={profile.isOnline ? 'Go offline' : 'Go online'}
            accessibilityHint="Toggles your driver availability for incoming ride requests"
            accessibilityRole="switch"
          />
        </View>

        <Pressable
          className={`ml-2 h-9 w-9 items-center justify-center rounded-full ${highContrastEnabled ? 'border border-white bg-black' : 'bg-zinc-100 dark:bg-zinc-800'}`}
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
          <Ionicons name="notifications-outline" size={18} color={highContrastEnabled ? '#FFFFFF' : profile.isOnline ? '#0f172a' : '#6b7280'} />
        </Pressable>
      </View>

      {/* Error / onboarding banner */}
      {(error || onboardingRequired) ? (
        <View className={`mt-2 flex-row items-center gap-2 rounded-2xl px-4 py-2 ${highContrastEnabled ? 'border border-white bg-black' : 'bg-rose-500/90'}`}>
          <Ionicons name="alert-circle-outline" size={14} color="#FFFFFF" />
          <Text className="flex-1 text-xs font-medium text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {error || 'Finish onboarding to unlock online mode.'}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
