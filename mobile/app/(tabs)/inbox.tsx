import { Text, View } from 'react-native';

const notices = [
  { id: '1', title: 'Peak pay unlocked', body: 'Mission District is paying +$4.50 per trip for the next 22 minutes.' },
  { id: '2', title: 'Weekly quality score', body: 'You are rated 4.92 this week. Keep accepting short pickups to stay Gold.' },
];

export default function InboxScreen() {
  return (
    <View className="flex-1 bg-zinc-50 p-4 dark:bg-zinc-950">
      {notices.map((notice) => (
        <View key={notice.id} className="mb-3 rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{notice.title}</Text>
          <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{notice.body}</Text>
        </View>
      ))}
    </View>
  );
}
