import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { useLocale } from '../../src/context/LocaleContext';
import { useScreenTracking } from '../../src/hooks/useScreenTracking';
import { logEvent } from '../../src/services/observability';
import type { RideHistoryItem } from '../../src/types/drive';

export default function TripsScreen() {
  const { rideHistory, isLoading, error, refreshData } = useDriveRealtime();
  useScreenTracking('trips');
  const { t, formatCurrency, formatNumber, formatTime } = useLocale();
  const hasTrips = rideHistory.length > 0;

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="px-5 pb-2 pt-14">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t('trips.title')}</Text>
      </View>

      {isLoading && !hasTrips && !error ? (
        <LoadingState label={t('common.loadingTrips')} />
      ) : !hasTrips && !error ? (
        <EmptyState icon="car-outline" title={t('trips.emptyTitle')} subtitle={t('trips.emptySubtitle')} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                logEvent('trips_refresh_tapped');
                void refreshData();
              }}
              tintColor="#16A34A"
            />
          }
        >
          {error ? <ErrorBanner message={error} onRetry={() => void refreshData()} /> : null}
          <View className="mt-2 gap-3">
            {rideHistory.map((ride: RideHistoryItem) => (
              <View key={ride.id} className="rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{ride.riderName}</Text>
                  <Text className="text-base font-bold text-emerald-600">{formatCurrency(ride.fare)}</Text>
                </View>
                <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400" numberOfLines={1} accessibilityLabel={ride.route}>{ride.route}</Text>
                <View className="mt-2 flex-row items-center gap-2">
                  <Text className="text-xs text-zinc-400 dark:text-zinc-500">{formatNumber(ride.miles, { maximumFractionDigits: 1 })} mi</Text>
                  <Text className="text-xs text-zinc-300 dark:text-zinc-600">·</Text>
                  <Text className="text-xs text-zinc-400 dark:text-zinc-500">{formatTime(ride.date)}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
