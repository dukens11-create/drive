import { Text, View } from 'react-native';

import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';

export default function InboxScreen() {
  const { notifications, isLoading, error } = useDriveRealtime();

  return (
    <View className="flex-1 bg-zinc-50 p-4 dark:bg-zinc-950">
      {isLoading ? <Text className="mb-3 text-sm text-zinc-500 dark:text-zinc-300">Loading notifications…</Text> : null}
      {error ? <Text className="mb-3 text-sm text-rose-500 dark:text-rose-300">{error}</Text> : null}
      {notifications.length === 0 ? <Text className="text-sm text-zinc-500 dark:text-zinc-300">No notifications yet.</Text> : null}
      {notifications.map((notice) => (
        <View key={notice.id} className="mb-3 rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{notice.title}</Text>
          <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{notice.body}</Text>
          <Text className="mt-2 text-[11px] uppercase tracking-wide text-zinc-400">{new Date(notice.createdAt).toLocaleTimeString()}</Text>
        </View>
      ))}
    </View>
  );
}
