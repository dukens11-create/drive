import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { FoodOrderStatus } from '../../src/types/food';
import { foodOrderStatusLabels, foodOrderStatusOrder } from '../../src/utils/foodStatus';

const STATUS_AUTO_ADVANCE_INTERVAL_MS = 6000;

export default function FoodOrderTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState<FoodOrderStatus>('placed');
  const [eta, setEta] = useState(32);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentStatus((previousStatus) => {
        const index = foodOrderStatusOrder.indexOf(previousStatus);
        if (index < foodOrderStatusOrder.length - 1) {
          setEta((value) => Math.max(0, value - 5));
          return foodOrderStatusOrder[index + 1];
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        return previousStatus;
      });
    }, STATUS_AUTO_ADVANCE_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const currentIndex = foodOrderStatusOrder.indexOf(currentStatus);
  const isDelivered = currentStatus === 'delivered';

  return (
    <View className="flex-1 bg-zinc-950">
      <View className="flex-row items-center px-5 pb-2 pt-14">
        <Pressable onPress={() => router.push('/(drawer)/(tabs)/food')} accessibilityRole="button" accessibilityLabel="Done" className="mr-3">
          <Text className="text-base font-bold text-emerald-400">Done</Text>
        </Pressable>
        <Text className="text-xl font-bold text-white">Order Tracking</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <View className="mt-2 rounded-2xl bg-zinc-900 p-4">
          <Text className="text-xs text-zinc-400">Order ID</Text>
          <Text className="mt-0.5 font-mono text-sm font-semibold text-white">{orderId ?? 'ORD-001'}</Text>
        </View>

        {!isDelivered ? (
          <View className="mt-4 rounded-2xl border border-emerald-700 bg-emerald-900/40 p-4">
            <Text className="text-xs text-emerald-300">Estimated Delivery</Text>
            <Text className="mt-1 text-3xl font-bold text-white">{eta} min</Text>
            <Text className="mt-0.5 text-xs text-zinc-400">ETA updates in real time</Text>
          </View>
        ) : (
          <View className="mt-4 items-center rounded-2xl bg-emerald-600 p-4">
            <Text className="text-4xl">✅</Text>
            <Text className="mt-2 text-xl font-bold text-white">Order Delivered!</Text>
            <Text className="mt-1 text-sm text-emerald-100">Enjoy your meal 🍽️</Text>
          </View>
        )}

        <View className="mt-4 rounded-2xl bg-zinc-900 p-4">
          <Text className="mb-4 text-sm font-semibold text-white">Order Status</Text>
          {foodOrderStatusOrder.map((status, index) => {
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;
            return (
              <View key={status} className="flex-row">
                <View className="mr-3 items-center">
                  <View className={`h-8 w-8 items-center justify-center rounded-full ${isCompleted ? 'bg-emerald-600' : 'bg-zinc-800'}`}>
                    {isCompleted ? <Text className="text-sm text-white">✓</Text> : <View className="h-2 w-2 rounded-full bg-zinc-600" />}
                  </View>
                  {index < foodOrderStatusOrder.length - 1 ? (
                    <View className={`my-0.5 w-0.5 flex-1 ${isCompleted ? 'bg-emerald-600' : 'bg-zinc-700'}`} style={{ minHeight: 20 }} />
                  ) : null}
                </View>
                <View className="flex-1 pb-4">
                  <Text className={`text-sm font-semibold ${isCurrent ? 'text-emerald-400' : isCompleted ? 'text-zinc-200' : 'text-zinc-500'}`}>
                    {foodOrderStatusLabels[status]}
                    {isCurrent ? ' ●' : ''}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {isDelivered ? (
          <Pressable
            className="mt-4 rounded-2xl bg-emerald-600 py-4"
            onPress={() => router.push({ pathname: '/(drawer)/food-order-rating', params: { orderId: orderId ?? 'ord-1' } })}
            accessibilityRole="button"
            accessibilityLabel="Rate your order"
          >
            <Text className="text-center font-bold text-white">Rate Your Order ⭐</Text>
          </Pressable>
        ) : null}

        <View className="mt-4 rounded-2xl bg-zinc-900 p-4">
          <Text className="text-sm font-semibold text-white">Need help?</Text>
          <Pressable
            className="mt-2 rounded-xl bg-zinc-800 py-2.5"
            onPress={() => router.push('/(drawer)/support')}
            accessibilityRole="button"
            accessibilityLabel="Contact support"
          >
            <Text className="text-center text-sm text-zinc-300">Contact Support</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
