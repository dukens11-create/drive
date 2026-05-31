import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PassengerScreen } from '../../../src/components/ui/PassengerScreen';

type Cuisine = 'All' | 'Pizza' | 'Burgers' | 'Sushi' | 'Chinese' | 'Mexican' | 'Indian' | 'Salads';

type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryMinutes: number;
  deliveryFee: number;
  minOrder: number;
  priceRange: 1 | 2 | 3;
  promoted?: boolean;
};

const SAMPLE_RESTAURANTS: Restaurant[] = [
  { id: 'r1', name: 'Pizza Palace', cuisine: 'Pizza', rating: 4.7, deliveryMinutes: 25, deliveryFee: 1.99, minOrder: 10, priceRange: 2, promoted: true },
  { id: 'r2', name: 'Burger Barn', cuisine: 'Burgers', rating: 4.5, deliveryMinutes: 20, deliveryFee: 0, minOrder: 8, priceRange: 1 },
  { id: 'r3', name: 'Tokyo Sushi', cuisine: 'Sushi', rating: 4.9, deliveryMinutes: 35, deliveryFee: 2.49, minOrder: 15, priceRange: 3 },
  { id: 'r4', name: 'Dragon Wok', cuisine: 'Chinese', rating: 4.3, deliveryMinutes: 30, deliveryFee: 1.49, minOrder: 12, priceRange: 2 },
  { id: 'r5', name: 'Taco Fiesta', cuisine: 'Mexican', rating: 4.6, deliveryMinutes: 22, deliveryFee: 0.99, minOrder: 9, priceRange: 1 },
  { id: 'r6', name: 'Spice Garden', cuisine: 'Indian', rating: 4.8, deliveryMinutes: 40, deliveryFee: 1.99, minOrder: 14, priceRange: 2 },
  { id: 'r7', name: 'Green Bowl', cuisine: 'Salads', rating: 4.4, deliveryMinutes: 18, deliveryFee: 0, minOrder: 10, priceRange: 2 },
];

const CUISINES: Cuisine[] = ['All', 'Pizza', 'Burgers', 'Sushi', 'Chinese', 'Mexican', 'Indian', 'Salads'];
const PRICE_LABELS: Record<1 | 2 | 3, string> = { 1: '$', 2: '$$', 3: '$$$' };

export default function FoodScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<Cuisine>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'time' | 'fee'>('rating');

  const filtered = SAMPLE_RESTAURANTS.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.cuisine.toLowerCase().includes(search.toLowerCase());
    const matchesCuisine = selectedCuisine === 'All' || r.cuisine === selectedCuisine;
    return matchesSearch && matchesCuisine;
  }).sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'time') return a.deliveryMinutes - b.deliveryMinutes;
    return a.deliveryFee - b.deliveryFee;
  });

  return (
    <PassengerScreen title="Food Delivery" subtitle="Order from restaurants near you.">
      {/* Search */}
      <TextInput
        className="mb-3 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
        placeholder="Search restaurants or cuisines…"
        placeholderTextColor="#71717a"
        value={search}
        onChangeText={setSearch}
        accessibilityLabel="Search restaurants"
      />

      {/* Cuisine filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 -mx-1">
        {CUISINES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setSelectedCuisine(c)}
            accessibilityRole="button"
            accessibilityLabel={`Filter by ${c}`}
            className={`mr-2 rounded-full px-4 py-2 ${selectedCuisine === c ? 'bg-emerald-600' : 'bg-zinc-800 border border-zinc-700'}`}
          >
            <Text className={`text-sm font-semibold ${selectedCuisine === c ? 'text-white' : 'text-zinc-300'}`}>{c}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sort options */}
      <View className="mb-4 flex-row gap-2">
        {(['rating', 'time', 'fee'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSortBy(s)}
            accessibilityRole="button"
            accessibilityLabel={`Sort by ${s}`}
            className={`flex-1 rounded-lg py-2 items-center ${sortBy === s ? 'bg-emerald-700' : 'bg-zinc-800'}`}
          >
            <Text className={`text-xs font-semibold ${sortBy === s ? 'text-white' : 'text-zinc-400'}`}>
              {s === 'rating' ? '⭐ Rating' : s === 'time' ? '⏱ Fastest' : '💸 Lowest fee'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Restaurant list */}
      {filtered.length === 0 ? (
        <View className="items-center py-8">
          <Text className="text-zinc-400">No restaurants match your search.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          scrollEnabled={false}
          renderItem={({ item: r }) => (
            <Pressable
              onPress={() => router.push({ pathname: '/(drawer)/food-restaurant-detail', params: { id: r.id, name: r.name } })}
              accessibilityRole="button"
              accessibilityLabel={`Open ${r.name}`}
              className="mb-3 rounded-2xl border border-zinc-700 bg-zinc-900 p-4"
            >
              {r.promoted && (
                <View className="mb-2 self-start rounded-full bg-amber-600 px-2 py-0.5">
                  <Text className="text-xs font-bold text-white">Promoted</Text>
                </View>
              )}
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-white">{r.name}</Text>
                <Text className="text-sm text-zinc-400">{PRICE_LABELS[r.priceRange]}</Text>
              </View>
              <Text className="mt-0.5 text-sm text-zinc-400">{r.cuisine}</Text>
              <View className="mt-2 flex-row items-center gap-3">
                <Text className="text-xs text-zinc-300">⭐ {r.rating.toFixed(1)}</Text>
                <Text className="text-xs text-zinc-300">⏱ {r.deliveryMinutes} min</Text>
                <Text className="text-xs text-zinc-300">
                  {r.deliveryFee === 0 ? '🆓 Free delivery' : `🚚 $${r.deliveryFee.toFixed(2)} delivery`}
                </Text>
              </View>
              <Text className="mt-1 text-xs text-zinc-500">Min. order: ${r.minOrder}</Text>
            </Pressable>
          )}
        />
      )}
    </PassengerScreen>
  );
}
