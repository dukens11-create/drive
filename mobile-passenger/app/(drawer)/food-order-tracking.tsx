import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PassengerScreen } from '../../src/components/ui/PassengerScreen';

type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered';

const ORDER_STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'placed', label: 'Order placed', emoji: '📋' },
  { status: 'confirmed', label: 'Restaurant confirmed', emoji: '✅' },
  { status: 'preparing', label: 'Preparing your food', emoji: '👨‍🍳' },
  { status: 'ready', label: 'Ready for pickup', emoji: '📦' },
  { status: 'picked_up', label: 'Driver picked up', emoji: '🛵' },
  { status: 'on_the_way', label: 'On the way', emoji: '🚀' },
  { status: 'delivered', label: 'Delivered!', emoji: '🎉' },
];

// Simulated status progression: one step every 4 seconds for demo purposes.
const STATUS_SEQUENCE: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered'];

export default function FoodOrderTrackingScreen() {
  const router = useRouter();
  const [statusIndex, setStatusIndex] = useState(0);
  const [rated, setRated] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);

  const currentStatus = STATUS_SEQUENCE[statusIndex] ?? 'placed';
  const isDelivered = currentStatus === 'delivered';
  const estimatedMinutes = Math.max(0, 28 - statusIndex * 4);

  useEffect(() => {
    if (statusIndex >= STATUS_SEQUENCE.length - 1) return;
    const timer = setTimeout(() => {
      setStatusIndex((prev) => Math.min(prev + 1, STATUS_SEQUENCE.length - 1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [statusIndex]);

  return (
    <PassengerScreen title="Order Tracking" subtitle="Track your food delivery in real time.">
      {/* ETA banner */}
      {!isDelivered ? (
        <View className="mb-4 rounded-xl bg-emerald-800 px-4 py-3">
          <Text className="text-center text-base font-bold text-white">
            🕐 Estimated delivery: {estimatedMinutes} min
          </Text>
        </View>
      ) : (
        <View className="mb-4 rounded-xl bg-emerald-600 px-4 py-3">
          <Text className="text-center text-base font-bold text-white">🎉 Your order has been delivered!</Text>
        </View>
      )}

      {/* Status timeline */}
      <View className="mb-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
        {ORDER_STEPS.map(({ status, label, emoji }, index) => {
          const stepIndex = STATUS_SEQUENCE.indexOf(status);
          const isDone = stepIndex <= statusIndex;
          const isActive = stepIndex === statusIndex;
          const isLast = index === ORDER_STEPS.length - 1;
          return (
            <View key={status} className={`flex-row items-center ${isLast ? '' : 'mb-3'}`}>
              <View
                className={`h-8 w-8 items-center justify-center rounded-full mr-3 ${
                  isDone ? 'bg-emerald-600' : 'bg-zinc-700'
                }`}
              >
                <Text className={`text-sm ${isDone ? 'text-white' : 'text-zinc-500'}`}>{emoji}</Text>
              </View>
              <View className="flex-1">
                <Text
                  className={`text-sm font-semibold ${
                    isActive ? 'text-emerald-400' : isDone ? 'text-zinc-200' : 'text-zinc-500'
                  }`}
                >
                  {label}
                </Text>
                {isActive && !isDelivered && (
                  <Text className="text-xs text-zinc-400">In progress…</Text>
                )}
              </View>
              {isDone && !isActive && <Text className="text-emerald-500 text-sm">✓</Text>}
            </View>
          );
        })}
      </View>

      {/* Driver card (visible after pickup) */}
      {(currentStatus === 'picked_up' || currentStatus === 'on_the_way' || currentStatus === 'delivered') && (
        <View className="mb-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <Text className="mb-2 text-sm font-semibold text-zinc-300">Delivery Driver</Text>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-base font-bold text-white">Alex R.</Text>
              <Text className="text-xs text-zinc-400">⭐ 4.8 · Toyota Corolla · ABC-1234</Text>
            </View>
            <View className="flex-row gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Call driver"
                className="h-10 w-10 items-center justify-center rounded-full bg-emerald-700"
              >
                <Text className="text-base">📞</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/(drawer)/chat')}
                accessibilityRole="button"
                accessibilityLabel="Message driver"
                className="h-10 w-10 items-center justify-center rounded-full bg-zinc-700"
              >
                <Text className="text-base">💬</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Order summary */}
      <View className="mb-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
        <Text className="mb-2 text-sm font-semibold text-zinc-300">Order Summary</Text>
        {[
          { name: 'Margherita', qty: 1, price: 12.99 },
          { name: 'Garlic Bread', qty: 2, price: 4.99 },
          { name: 'Cola', qty: 2, price: 1.99 },
        ].map((item) => (
          <View key={item.name} className="flex-row justify-between mb-1">
            <Text className="text-sm text-zinc-400">{item.qty}× {item.name}</Text>
            <Text className="text-sm text-zinc-300">${(item.price * item.qty).toFixed(2)}</Text>
          </View>
        ))}
        <View className="mt-2 flex-row justify-between border-t border-zinc-700 pt-2">
          <Text className="font-semibold text-white">Total paid</Text>
          <Text className="font-semibold text-white">$25.94</Text>
        </View>
      </View>

      {/* Rating (shown after delivery) */}
      {isDelivered && !rated && (
        <View className="mb-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <Text className="mb-3 text-center text-sm font-semibold text-zinc-300">Rate your order</Text>
          <View className="flex-row justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setSelectedRating(star)}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${star} star${star !== 1 ? 's' : ''}`}
              >
                <Text className={`text-3xl ${star <= selectedRating ? 'opacity-100' : 'opacity-30'}`}>⭐</Text>
              </Pressable>
            ))}
          </View>
          {selectedRating > 0 && (
            <Pressable
              onPress={() => setRated(true)}
              accessibilityRole="button"
              accessibilityLabel="Submit rating"
              className="mt-3 rounded-xl bg-emerald-600 py-3"
            >
              <Text className="text-center font-bold text-white">Submit Rating</Text>
            </Pressable>
          )}
        </View>
      )}
      {isDelivered && rated && (
        <View className="mb-4 rounded-xl bg-emerald-900 p-3">
          <Text className="text-center text-sm text-emerald-300">Thanks for your feedback!</Text>
        </View>
      )}

      {/* Support / SOS */}
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => router.push('/(drawer)/support')}
          accessibilityRole="button"
          accessibilityLabel="Contact support"
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-3"
        >
          <Text className="text-center text-sm font-semibold text-zinc-300">Contact Support</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(drawer)/sos')}
          accessibilityRole="button"
          accessibilityLabel="Emergency SOS"
          className="rounded-xl border border-red-700 bg-red-900 px-5 py-3"
        >
          <Text className="text-center text-sm font-bold text-red-300">🆘 SOS</Text>
        </Pressable>
      </View>
    </PassengerScreen>
  );
}
