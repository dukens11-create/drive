import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '../../src/components/ui/EmptyState';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { useScreenTracking } from '../../src/hooks/useScreenTracking';
import { logEvent } from '../../src/services/observability';
import { buildFoodDeliveryRequests } from '../../src/services/realtime/mockFoodDeliveryFeed';
import type { ActiveFoodDelivery, DriverMode, FoodDeliveryRequest } from '../../src/types/drive';
import { foodDeliveryActionLabels, foodDeliveryStatusLabels, getNextFoodDeliveryStatus } from '../../src/utils/foodDeliveryStatus';

export default function FoodDeliveriesScreen() {
  const { profile } = useDriveRealtime();
  useScreenTracking('food-deliveries');

  const [driverMode, setDriverMode] = useState<DriverMode>('rides');
  const [pendingRequests, setPendingRequests] = useState<FoodDeliveryRequest[]>([]);
  const [activeDelivery, setActiveDelivery] = useState<ActiveFoodDelivery | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [foodEarnings, setFoodEarnings] = useState(0);
  const [foodDeliveryCount, setFoodDeliveryCount] = useState(0);

  const loadRequests = useCallback(async () => {
    if (driverMode === 'rides') {
      setPendingRequests([]);
      return;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setPendingRequests(buildFoodDeliveryRequests().slice(0, 2));
    setIsLoading(false);
  }, [driverMode]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleAccept = (request: FoodDeliveryRequest) => {
    logEvent('food_delivery_accepted', { deliveryId: request.id, driverId: profile.id });
    setActiveDelivery({
      ...request,
      deliveryId: request.id,
      status: 'going_to_restaurant',
    });
    setPendingRequests([]);
  };

  const handleDecline = (requestId: string) => {
    logEvent('food_delivery_declined', { deliveryId: requestId, driverId: profile.id });
    setPendingRequests((previous) => previous.filter((request) => request.id !== requestId));
  };

  const handleAdvanceDelivery = () => {
    if (!activeDelivery) {
      return;
    }
    const nextStatus = getNextFoodDeliveryStatus(activeDelivery.status);
    if (!nextStatus) {
      // Already at completed - dismiss
      setActiveDelivery(null);
      void loadRequests();
      return;
    }
    setActiveDelivery({ ...activeDelivery, status: nextStatus });
    if (nextStatus === 'completed') {
      logEvent('food_delivery_completed', {
        deliveryId: activeDelivery.deliveryId,
        driverId: profile.id,
        earnings: activeDelivery.estimatedEarnings,
      });
      setFoodEarnings((previous) => previous + activeDelivery.estimatedEarnings);
      setFoodDeliveryCount((previous) => previous + 1);
      setTimeout(() => {
        setActiveDelivery(null);
        void loadRequests();
      }, 600);
    }
  };

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="px-5 pb-2 pt-14">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Food Deliveries</Text>

        <View className="mt-3 flex-row rounded-2xl bg-zinc-200 p-1 dark:bg-zinc-800">
          {(['rides', 'food', 'both'] as const).map((mode) => (
            <Pressable
              key={mode}
              className={`flex-1 rounded-xl py-2 ${driverMode === mode ? 'bg-white shadow-sm dark:bg-zinc-600' : ''}`}
              onPress={() => {
                logEvent('driver_mode_changed', { mode, driverId: profile.id });
                setDriverMode(mode);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: driverMode === mode }}
              accessibilityLabel={`Switch to ${mode} mode`}
            >
              <Text className={`text-center text-xs font-semibold capitalize ${driverMode === mode ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                {mode}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {foodDeliveryCount > 0 || foodEarnings > 0 ? (
        <View className="mx-5 mb-3 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-emerald-600 p-3">
            <Text className="text-xs text-emerald-100">Food Earnings</Text>
            <Text className="mt-0.5 text-xl font-bold text-white">${foodEarnings.toFixed(2)}</Text>
          </View>
          <View className="flex-1 rounded-2xl bg-white p-3 shadow-soft dark:bg-zinc-900">
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">Deliveries</Text>
            <Text className="mt-0.5 text-xl font-bold text-zinc-900 dark:text-zinc-100">{foodDeliveryCount}</Text>
          </View>
        </View>
      ) : null}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadRequests} tintColor="#16A34A" />}
      >
        {activeDelivery ? (
          <View className="mb-4 rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-zinc-900 dark:text-zinc-100">Active Delivery</Text>
              <View className="rounded-full bg-emerald-100 px-2 py-1 dark:bg-emerald-900/40">
                <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{foodDeliveryStatusLabels[activeDelivery.status]}</Text>
              </View>
            </View>
            <Text className="mt-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">{activeDelivery.restaurantName}</Text>
            <Text className="text-xs text-zinc-500 dark:text-zinc-400">{activeDelivery.restaurantAddress}</Text>
            <Text className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">→ {activeDelivery.customerAddress}</Text>
            <View className="mt-2">
              {activeDelivery.items.map((item, index) => (
                <Text key={`${item.name}-${index}`} className="text-xs text-zinc-500 dark:text-zinc-400">{item.quantity}× {item.name}</Text>
              ))}
            </View>
            {activeDelivery.deliveryInstructions ? (
              <View className="mt-2 rounded-xl bg-amber-50 p-2 dark:bg-amber-900/20">
                <Text className="text-xs text-amber-700 dark:text-amber-300">📝 {activeDelivery.deliveryInstructions}</Text>
              </View>
            ) : null}
            <Pressable
              className="mt-3 rounded-xl bg-emerald-600 py-3"
              onPress={handleAdvanceDelivery}
              accessibilityRole="button"
              accessibilityLabel={foodDeliveryActionLabels[activeDelivery.status]}
            >
              <Text className="text-center font-semibold text-white">{foodDeliveryActionLabels[activeDelivery.status]}</Text>
            </Pressable>
          </View>
        ) : driverMode === 'rides' ? (
          <EmptyState icon="bicycle-outline" title="Food delivery is off" subtitle="Switch to 'Food' or 'Both' mode to receive food delivery orders." />
        ) : pendingRequests.length === 0 && !isLoading ? (
          <EmptyState icon="restaurant-outline" title="No orders yet" subtitle="You'll be notified when a food delivery order is available nearby." />
        ) : (
          <View className="gap-3">
            <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Pending Orders ({pendingRequests.length})</Text>
            {pendingRequests.map((request) => (
              <View key={request.id} className="rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="text-base font-bold text-zinc-900 dark:text-zinc-100">{request.restaurantName}</Text>
                    <Text className="text-xs text-zinc-500 dark:text-zinc-400">{request.restaurantAddress}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-bold text-emerald-600">${request.estimatedEarnings.toFixed(2)}</Text>
                    <Text className="text-xs text-zinc-400">{request.estimatedTimeMinutes} min</Text>
                  </View>
                </View>
                <View className="mt-2 flex-row gap-2">
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">📍 {request.estimatedPickupDistanceKm.toFixed(1)} km to restaurant</Text>
                  <Text className="text-xs text-zinc-400">·</Text>
                  <Text className="text-xs text-zinc-500 dark:text-zinc-400">🏠 {request.estimatedDeliveryDistanceKm.toFixed(1)} km delivery</Text>
                </View>
                <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">→ {request.customerAddress}</Text>
                <View className="mt-2">
                  {request.items.map((item, index) => (
                    <Text key={`${item.name}-${index}`} className="text-xs text-zinc-400">{item.quantity}× {item.name}</Text>
                  ))}
                </View>
                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    className="flex-1 rounded-xl border border-zinc-200 py-2.5 dark:border-zinc-700"
                    onPress={() => handleDecline(request.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Decline delivery from ${request.restaurantName}`}
                  >
                    <Text className="text-center text-sm font-semibold text-zinc-600 dark:text-zinc-300">Decline</Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5"
                    onPress={() => handleAccept(request)}
                    accessibilityRole="button"
                    accessibilityLabel={`Accept delivery from ${request.restaurantName}`}
                  >
                    <Text className="text-center text-sm font-semibold text-white">Accept</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
