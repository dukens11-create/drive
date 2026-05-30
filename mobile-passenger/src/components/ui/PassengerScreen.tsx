import type { PropsWithChildren } from 'react';
import { ScrollView, Text, View } from 'react-native';

type PassengerScreenProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

export function PassengerScreen({ title, subtitle, children }: PassengerScreenProps) {
  return (
    <ScrollView className="flex-1 bg-zinc-950" contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View>
        <Text className="text-2xl font-bold text-white">{title}</Text>
        <Text className="mt-1 text-sm text-zinc-300">{subtitle}</Text>
      </View>
      <View className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">{children}</View>
    </ScrollView>
  );
}
