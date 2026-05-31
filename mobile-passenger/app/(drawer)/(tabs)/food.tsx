import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useFoodStore } from '../../../src/store/foodStore';
import type { Restaurant } from '../../../src/types/food';

const CUISINES = ['All', 'Indian', 'Chinese', 'Italian', 'Mexican', 'Japanese', 'American', 'Thai'];

const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest-1',
    name: 'Spice Garden',
    cuisineTypes: ['Indian'],
    rating: 4.7,
    reviewCount: 320,
    deliveryTimeMinutes: 30,
    deliveryFee: 2.99,
    minimumOrder: 15,
    isOpen: true,
    address: '123 Main St',
    distanceKm: 1.2,
    isFeatured: true,
    promotionBadge: '20% OFF',
  },
  {
    id: 'rest-2',
    name: 'Dragon Palace',
    cuisineTypes: ['Chinese'],
    rating: 4.5,
    reviewCount: 210,
    deliveryTimeMinutes: 25,
    deliveryFee: 1.99,
    minimumOrder: 12,
    isOpen: true,
    address: '456 Oak Ave',
    distanceKm: 0.8,
  },
  {
    id: 'rest-3',
    name: 'La Bella Italia',
    cuisineTypes: ['Italian'],
    rating: 4.8,
    reviewCount: 450,
    deliveryTimeMinutes: 35,
    deliveryFee: 3.49,
    minimumOrder: 20,
    isOpen: true,
    address: '789 Pine Rd',
    distanceKm: 2.1,
    isFeatured: true,
  },
  {
    id: 'rest-4',
    name: 'Taco Fiesta',
    cuisineTypes: ['Mexican'],
    rating: 4.3,
    reviewCount: 180,
    deliveryTimeMinutes: 20,
    deliveryFee: 0.99,
    minimumOrder: 10,
    isOpen: true,
    address: '321 Elm St',
    distanceKm: 0.5,
  },
];

const cuisineEmoji: Record<string, string> = {
  Indian: '🍛',
  Chinese: '🥢',
  Italian: '🍕',
  Mexican: '🌮',
};

export default function FoodDiscoveryScreen() {
  const router = useRouter();
  const { setActiveRestaurant, cartItemCount } = useFoodStore();
  const [query, setQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');

  const filteredRestaurants = MOCK_RESTAURANTS.filter((restaurant) => {
    const matchesQuery = !query || restaurant.name.toLowerCase().includes(query.toLowerCase());
    const matchesCuisine = selectedCuisine === 'All' || restaurant.cuisineTypes.includes(selectedCuisine);
    return matchesQuery && matchesCuisine;
  });

  const cartCount = cartItemCount();

  return (
    <View className="flex-1 bg-zinc-950">
      <View className="px-5 pb-2 pt-14">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-white">Food Delivery</Text>
          {cartCount > 0 ? (
            <Pressable
              className="rounded-full bg-emerald-600 px-3 py-1.5"
              onPress={() => router.push('/(drawer)/food-cart')}
              accessibilityRole="button"
              accessibilityLabel={`View cart with ${cartCount} items`}
            >
              <Text className="text-xs font-bold text-white">Cart ({cartCount})</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="mt-3 rounded-xl bg-zinc-800 px-4 py-2">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search restaurants..."
            placeholderTextColor="#71717A"
            className="text-sm text-white"
            accessibilityLabel="Search restaurants"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 -mx-1">
          <View className="flex-row gap-2 px-1 pb-1">
            {CUISINES.map((cuisine) => (
              <Pressable
                key={cuisine}
                className={`rounded-full px-3 py-1.5 ${selectedCuisine === cuisine ? 'bg-emerald-600' : 'bg-zinc-800'}`}
                onPress={() => setSelectedCuisine(cuisine)}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedCuisine === cuisine }}
                accessibilityLabel={`Filter by ${cuisine}`}
              >
                <Text className={`text-xs font-semibold ${selectedCuisine === cuisine ? 'text-white' : 'text-zinc-300'}`}>{cuisine}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {filteredRestaurants.length === 0 ? (
          <View className="mt-8 items-center">
            <Text className="text-base font-semibold text-zinc-400">No restaurants found</Text>
            <Text className="mt-1 text-sm text-zinc-500">Try a different search or filter</Text>
          </View>
        ) : (
          <>
            <Text className="mb-3 mt-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
              {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''}
            </Text>
            <View className="gap-3">
              {filteredRestaurants.map((restaurant) => (
                <Pressable
                  key={restaurant.id}
                  className="overflow-hidden rounded-2xl bg-zinc-900"
                  onPress={() => {
                    setActiveRestaurant(restaurant);
                    router.push({ pathname: '/(drawer)/restaurant-detail', params: { id: restaurant.id } });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${restaurant.name}, ${restaurant.cuisineTypes.join(', ')}, rating ${restaurant.rating}`}
                >
                  <View className="h-36 w-full items-center justify-center bg-zinc-800">
                    <Text className="text-3xl">{cuisineEmoji[restaurant.cuisineTypes[0]] ?? '🍽️'}</Text>
                  </View>
                  {restaurant.promotionBadge ? (
                    <View className="absolute right-3 top-3 rounded-lg bg-emerald-600 px-2 py-1">
                      <Text className="text-xs font-bold text-white">{restaurant.promotionBadge}</Text>
                    </View>
                  ) : null}
                  <View className="p-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-base font-bold text-white">{restaurant.name}</Text>
                      {restaurant.isFeatured ? (
                        <View className="rounded bg-amber-500/20 px-2 py-0.5">
                          <Text className="text-[10px] font-semibold text-amber-400">Featured</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text className="mt-0.5 text-xs text-zinc-400">{restaurant.cuisineTypes.join(' · ')}</Text>
                    <View className="mt-2 flex-row items-center gap-3">
                      <Text className="text-xs text-zinc-300">⭐ {restaurant.rating} ({restaurant.reviewCount})</Text>
                      <Text className="text-xs text-zinc-400">·</Text>
                      <Text className="text-xs text-zinc-300">🕐 {restaurant.deliveryTimeMinutes} min</Text>
                      <Text className="text-xs text-zinc-400">·</Text>
                      <Text className="text-xs text-zinc-300">${restaurant.deliveryFee.toFixed(2)} delivery</Text>
                    </View>
                    <Text className="mt-1 text-xs text-zinc-500">Min. order ${restaurant.minimumOrder} · {restaurant.distanceKm} km away</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
