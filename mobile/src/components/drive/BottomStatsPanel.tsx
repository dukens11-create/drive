import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useDriveRealtime } from '../../context/DriveRealtimeContext';

const collapsedHeight = 148;
const expandedHeight = 380;

export const BottomStatsPanel = () => {
  const { metrics, rideHistory, profile } = useDriveRealtime();
  const panelHeight = useSharedValue(collapsedHeight);

  const toggleExpanded = () => {
    panelHeight.value = withTiming(panelHeight.value === collapsedHeight ? expandedHeight : collapsedHeight, { duration: 250 });
  };

  const panelStyle = useAnimatedStyle(() => ({
    height: panelHeight.value,
  }));

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

      <View className="mt-4 gap-3">
        <ActionRow title="Ride history" subtitle={rideHistory[0]?.route ?? 'No completed rides'} />
        <ActionRow title="Earnings details" subtitle={`Net payouts updated live · $${(metrics.earningsToday * 0.86).toFixed(2)}`} />
        <ActionRow title="Peak zones" subtitle="Downtown + Mission Bay surge x1.4" />
        <ActionRow title="Support" subtitle="Priority line available now" />
        <ActionRow title="Vehicle status" subtitle={profile.vehicleStatus === 'good' ? 'Vehicle health: Good' : 'Service due soon'} />
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

const ActionRow = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-700">
    <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</Text>
    <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">{subtitle}</Text>
  </View>
);
