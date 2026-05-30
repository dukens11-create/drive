import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { LoadingState } from '../../src/components/ui/LoadingState';
import type { RideHistoryItem } from '../../src/types/drive';

export default function EarningsScreen() {
  const { metrics, rideHistory, isLoading, error, refreshData } = useDriveRealtime();
  const hasEarnings = metrics.tripsCompleted > 0;

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="px-5 pb-2 pt-14">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Earnings</Text>
      </View>

      {isLoading && !hasEarnings && !error ? (
        <LoadingState label="Loading earnings…" />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refreshData()} tintColor="#16A34A" />}
        >
          {error ? <ErrorBanner message={error} onRetry={() => void refreshData()} /> : null}

          {/* Hero earnings card */}
          <View className="mt-2 rounded-3xl bg-emerald-600 p-6 shadow-soft">
            <Text className="text-sm font-medium text-emerald-100">Today's net earnings</Text>
            <Text className="mt-1 text-5xl font-bold text-white">${metrics.earningsToday.toFixed(2)}</Text>
            <Text className="mt-3 text-sm text-emerald-100">
              {metrics.tripsCompleted} {metrics.tripsCompleted === 1 ? 'trip' : 'trips'} · {metrics.hoursOnline.toFixed(1)} h online
            </Text>
          </View>

          {/* Secondary stat grid */}
          <View className="mt-4 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
              <Text className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Avg per trip</Text>
              <Text className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">${metrics.earningsPerTrip.toFixed(2)}</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
              <Text className="text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Avg per hour</Text>
              <Text className="mt-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">${metrics.earningsPerHour.toFixed(2)}</Text>
            </View>
          </View>

          {/* Recent trips breakdown */}
          <Text className="mb-3 mt-6 text-base font-semibold text-zinc-800 dark:text-zinc-100">Recent trips</Text>
          {!hasEarnings ? (
            <EmptyState
              icon="cash-outline"
              title="No earnings yet"
              subtitle="Complete your first trip to start seeing earnings here."
            />
          ) : (
            <View className="gap-3">
              {rideHistory.map((ride: RideHistoryItem) => (
                <View key={ride.id} className="flex-row items-center rounded-2xl bg-white px-4 py-3 shadow-soft dark:bg-zinc-900">
                  <View className="mr-3 flex-1">
                    <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{ride.riderName}</Text>
                    <Text className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{ride.miles} mi · {ride.timeLabel}</Text>
                  </View>
                  <Text className="text-base font-bold text-emerald-600">+${ride.fare.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
