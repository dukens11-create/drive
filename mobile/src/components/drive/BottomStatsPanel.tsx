import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useDriveRealtime } from '../../context/DriveRealtimeContext';
import { driverStatusMeta } from '../../utils/driveStatus';

const SNAP_PEEK = 96;
const SNAP_HALF = 224;
const SNAP_FULL = 464;
const SNAP_POINTS = [SNAP_PEEK, SNAP_HALF, SNAP_FULL];

const clampToBounds = (value: number) => {
  'worklet';
  return Math.max(SNAP_PEEK, Math.min(SNAP_FULL, value));
};

const findClosestSnapPoint = (value: number) => {
  'worklet';
  return SNAP_POINTS.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
};

export const BottomStatsPanel = () => {
  const { metrics, rideHistory, profile, activeRequest, activeTrip, requestTimeLeft, nearbyRequests } = useDriveRealtime();
  const panelHeight = useSharedValue(SNAP_HALF);
  const startHeight = useSharedValue(SNAP_HALF);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      startHeight.value = panelHeight.value;
    })
    .onUpdate((e) => {
      panelHeight.value = clampToBounds(startHeight.value - e.translationY);
    })
    .onEnd(() => {
      panelHeight.value = withSpring(findClosestSnapPoint(panelHeight.value), { damping: 20, stiffness: 200 });
    });

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
      : 'Go online to start receiving ride requests from nearby riders.';

  const peakZone = nearbyRequests.reduce<(typeof nearbyRequests)[number] | null>(
    (best, current) => (!best || current.surgeMultiplier > best.surgeMultiplier ? current : best),
    null
  );

  return (
    <Animated.View style={panelStyle} className="absolute bottom-20 left-0 right-0 z-20 overflow-hidden rounded-t-[32px] bg-white px-5 pb-5 shadow-soft dark:bg-zinc-900">
      <GestureDetector gesture={gesture}>
        <View className="items-center pb-4 pt-3">
          <View className="h-1.5 w-14 rounded-full bg-zinc-300 dark:bg-zinc-600" />
        </View>
      </GestureDetector>

      {/* Earnings strip — always visible at peek height */}
      <View className="flex-row justify-between rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
        <StatItem label="Today" value={`$${metrics.earningsToday.toFixed(2)}`} />
        <StatItem label="Trips" value={String(metrics.tripsCompleted)} />
        <StatItem label="Hours" value={metrics.hoursOnline.toFixed(1)} />
      </View>

      {/* Session status */}
      <View className="mt-4 rounded-3xl bg-zinc-100 p-4 dark:bg-zinc-800">
        <Text className="text-xs uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          Current session
        </Text>
        <Text className="mt-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {liveTitle}
        </Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{liveSubtitle}</Text>
      </View>

      {/* Recent rides */}
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
          subtitle={
            peakZone
              ? `${peakZone.zoneName} surge x${peakZone.surgeMultiplier.toFixed(1)} active`
              : 'City demand is steady'
          }
        />
        <InfoCard
          title="Vehicle"
          subtitle={profile.vehicleStatus === 'good' ? 'Inspection up to date' : 'Service due soon'}
        />
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
