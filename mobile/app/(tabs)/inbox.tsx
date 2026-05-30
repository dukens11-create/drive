import { RefreshControl, ScrollView, Text, View } from 'react-native';

import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { LoadingState } from '../../src/components/ui/LoadingState';

export default function InboxScreen() {
  const { notifications, isLoading, error, refreshData } = useDriveRealtime();
  const hasNotifications = notifications.length > 0;

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="px-5 pb-2 pt-14">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Inbox</Text>
      </View>

      {isLoading && !hasNotifications && !error ? (
        <LoadingState label="Loading notifications…" />
      ) : !hasNotifications && !error ? (
        <EmptyState icon="mail-outline" title="All caught up" subtitle="Trip updates and earnings alerts will appear here." />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refreshData()} tintColor="#16A34A" />}
        >
          {error ? <ErrorBanner message={error} onRetry={() => void refreshData()} /> : null}
          <View className="mt-2 gap-3">
            {notifications.map((notice: { id: string; title: string; body: string; createdAt: string }) => (
              <View key={notice.id} className="rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
                <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{notice.title}</Text>
                <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{notice.body}</Text>
                <Text className="mt-2 text-[11px] uppercase tracking-wide text-zinc-400">{new Date(notice.createdAt).toLocaleTimeString()}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
