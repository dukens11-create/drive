import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useDriveRealtime } from '../../context/DriveRealtimeContext';
import { driverStatusMeta } from '../../utils/driveStatus';

const COLLAPSED_PANEL_HEIGHT = 176;
const EXPANDED_PANEL_HEIGHT = 436;

export const BottomStatsPanel = () => {
  const { metrics, rideHistory, profile, activeRequest, activeTrip, requestTimeLeft, nearbyRequests } = useDriveRealtime();
  const panelHeight = useSharedValue(COLLAPSED_PANEL_HEIGHT);

  const toggleExpanded = () => {
    panelHeight.value = withTiming(
      panelHeight.value === COLLAPSED_PANEL_HEIGHT ? EXPANDED_PANEL_HEIGHT : COLLAPSED_PANEL_HEIGHT,
      { duration: 250 }
    );
  };

  const panelStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
  }));

  const displayStatus = activeTrip?.status ?? profile.status;
  const liveTitle = activeRequest && !activeTrip ? 'Incoming request live' : driverStatusMeta[displayStatus].label;
  const liveSubtitle = activeTrip
    ? `${driverStatusMeta[activeTrip.status].subtitle} · ${activeTrip.riderName}`
    : activeRequest
      ? `${activeRequest.riderName} · expires in ${requestTimeLeft}s · ${activeRequest.pickupAddress}`
    : profile.isOnline
      ? 'Online now and matching with nearby riders in the busiest zones.'
      : 'You are offline. Toggle online when you are ready to drive.';
  const peakZone = nearbyRequests.reduce<(typeof nearbyRequests)[number] | null>(
    (best, current) => (!best || current.surgeMultiplier > best.surgeMultiplier ? current : best),
    null
  );

  return (
    <Animated.View style={panelStyle} className="absolute bottom-20 left-0 right-0 z-20 rounded-t-[32px] bg-white px-5 pb-5 pt-4 shadow-soft dark:bg-zinc-900">
      <Pressable className="items-center pb-3" onPress={toggleExpanded}>
        <View className="h-1.5 w-16 rounded-full bg-zinc-300 dark:bg-zinc-700" />
      </Pressable>

      <View className="flex-row justify-between rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
        <StatItem label="Today" value={`$${metrics.earningsToday.toFixed(2)}`} />
        <StatItem label="Trips" value={String(metrics.tripsCompleted)} />
        <StatItem label="Hours" value={metrics.hoursOnline.toFixed(1)} />
      </View>

      <View className="mt-4 rounded-3xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <Text className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-300">Current session</Text>
        <Text className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{liveTitle}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{liveSubtitle}</Text>
      </View>

      <View className="mt-4 gap-3">
        {rideHistory.slice(0, 3).map((ride) => (
          <View key={ride.id} className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-700">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{ride.riderName}</Text>
                <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">{ride.route}</Text>
              </View>
              <Text className="text-sm font-semibold text-emerald-600">${ride.fare.toFixed(2)}</Text>
            </View>
            <Text className="mt-2 text-xs uppercase tracking-wide text-zinc-400">{ride.timeLabel}</Text>
          </View>
        ))}
      </View>

      <View className="mt-4 flex-row gap-3">
        <InfoCard
          title="Peak area"
          subtitle={peakZone ? `${peakZone.zoneName} surge x${peakZone.surgeMultiplier.toFixed(1)} active now` : 'City demand is steady'}
        />
        <InfoCard title="Vehicle" subtitle={profile.vehicleStatus === 'good' ? 'Inspection up to date' : 'Service due soon'} />
      </View>
    </Animated.View>
  );
};

const StatItem = ({ label, value }: { label: string; value: string }) => (
  <View>
    <Text className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-300">{label}</Text>
    <Text className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{value}</Text>
  </View>
);

const InfoCard = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View className="flex-1 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-700">
    <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</Text>
    <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">{subtitle}</Text>
  </View>
);
