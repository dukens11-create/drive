import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { useFoodStore } from '../../src/store/foodStore';
import type { MenuCategory, MenuItem } from '../../src/types/food';

const MOCK_MENU: MenuCategory[] = [
  {
    id: 'cat-1',
    name: 'Starters',
    items: [
      {
        id: 'item-1',
        categoryId: 'cat-1',
        name: 'Samosa (2 pcs)',
        description: 'Crispy pastry filled with spiced potatoes',
        price: 5.99,
        rating: 4.6,
        allergens: ['gluten'],
        isAvailable: true,
      },
      {
        id: 'item-2',
        categoryId: 'cat-1',
        name: 'Onion Bhaji',
        description: 'Golden fried onion fritters',
        price: 6.49,
        rating: 4.4,
        allergens: ['gluten'],
        isAvailable: true,
      },
    ],
  },
  {
    id: 'cat-2',
    name: 'Main Course',
    items: [
      {
        id: 'item-3',
        categoryId: 'cat-2',
        name: 'Butter Chicken',
        description: 'Tender chicken in creamy tomato sauce',
        price: 14.99,
        rating: 4.8,
        allergens: ['dairy'],
        isAvailable: true,
      },
      {
        id: 'item-4',
        categoryId: 'cat-2',
        name: 'Palak Paneer',
        description: 'Fresh cottage cheese in spinach gravy',
        price: 13.49,
        rating: 4.7,
        allergens: ['dairy'],
        isAvailable: true,
      },
      {
        id: 'item-5',
        categoryId: 'cat-2',
        name: 'Chicken Biryani',
        description: 'Aromatic basmati rice with spiced chicken',
        price: 15.99,
        rating: 4.9,
        allergens: [],
        isAvailable: true,
      },
    ],
  },
  {
    id: 'cat-3',
    name: 'Desserts',
    items: [
      {
        id: 'item-6',
        categoryId: 'cat-3',
        name: 'Gulab Jamun',
        description: 'Soft milk dumplings in rose syrup',
        price: 4.99,
        rating: 4.5,
        allergens: ['dairy', 'gluten'],
        isAvailable: true,
      },
    ],
  },
];

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeRestaurant, addToCart, cartItemCount } = useFoodStore();
  const [selectedCategory, setSelectedCategory] = useState('cat-1');
  const cartCount = cartItemCount();
  const currentCategory = MOCK_MENU.find((category) => category.id === selectedCategory) ?? MOCK_MENU[0];

  return (
    <View className="flex-1 bg-zinc-950">
      <View className="h-48 items-center justify-center bg-zinc-800">
        <Text className="text-6xl">🍽️</Text>
        {activeRestaurant?.promotionBadge ? (
          <View className="absolute right-4 top-4 rounded-lg bg-emerald-600 px-2 py-1">
            <Text className="text-xs font-bold text-white">{activeRestaurant.promotionBadge}</Text>
          </View>
        ) : null}
      </View>

      <Pressable
        className="absolute left-4 top-12 rounded-full bg-zinc-900/80 p-2"
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text className="font-bold text-white">←</Text>
      </Pressable>

      {cartCount > 0 ? (
        <Pressable
          className="absolute right-4 top-12 rounded-full bg-emerald-600 px-3 py-2"
          onPress={() => router.push('/(drawer)/food-cart')}
          accessibilityRole="button"
          accessibilityLabel={`View cart with ${cartCount} items`}
        >
          <Text className="text-xs font-bold text-white">Cart ({cartCount})</Text>
        </Pressable>
      ) : null}

      <View className="px-5 py-4">
        <Text className="text-xl font-bold text-white">{activeRestaurant?.name ?? 'Restaurant'}</Text>
        <Text className="mt-0.5 text-xs text-zinc-400">{activeRestaurant?.cuisineTypes?.join(' · ')}</Text>
        <View className="mt-2 flex-row gap-3">
          <Text className="text-xs text-zinc-300">⭐ {activeRestaurant?.rating} ({activeRestaurant?.reviewCount} reviews)</Text>
          <Text className="text-xs text-zinc-400">·</Text>
          <Text className="text-xs text-zinc-300">🕐 {activeRestaurant?.deliveryTimeMinutes} min</Text>
        </View>
        <View className="mt-1 flex-row gap-3">
          <Text className="text-xs text-zinc-400">${activeRestaurant?.deliveryFee?.toFixed(2) ?? '0.00'} delivery fee</Text>
          <Text className="text-xs text-zinc-500">·</Text>
          <Text className="text-xs text-zinc-400">Min. ${activeRestaurant?.minimumOrder ?? 0}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-zinc-800">
        <View className="flex-row px-5">
          {MOCK_MENU.map((category) => (
            <Pressable
              key={category.id}
              className={`mr-4 border-b-2 py-3 ${selectedCategory === category.id ? 'border-emerald-500' : 'border-transparent'}`}
              onPress={() => setSelectedCategory(category.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: selectedCategory === category.id }}
              accessibilityLabel={`${category.name} menu category`}
            >
              <Text className={`text-sm font-semibold ${selectedCategory === category.id ? 'text-emerald-400' : 'text-zinc-400'}`}>{category.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
        {(currentCategory?.items ?? []).map((item: MenuItem) => (
          <View key={item.id} className="flex-row rounded-2xl bg-zinc-900 p-4">
            <View className="flex-1 pr-3">
              <Text className="text-sm font-semibold text-white">{item.name}</Text>
              <Text className="mt-0.5 text-xs text-zinc-400" numberOfLines={2}>{item.description}</Text>
              {item.allergens.length > 0 ? (
                <View className="mt-1 flex-row gap-1">
                  {item.allergens.map((allergen) => (
                    <View key={allergen} className="rounded bg-amber-500/20 px-1.5 py-0.5">
                      <Text className="text-[10px] text-amber-400">{allergen}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {item.rating ? <Text className="mt-1 text-xs text-zinc-500">⭐ {item.rating}</Text> : null}
              <Text className="mt-2 text-base font-bold text-emerald-400">${item.price.toFixed(2)}</Text>
            </View>
            <View className="h-20 w-20 items-center justify-center rounded-xl bg-zinc-800">
              <Text className="text-3xl">🍴</Text>
            </View>
            <Pressable
              className="absolute bottom-4 right-4 rounded-full bg-emerald-600 px-3 py-1"
              onPress={() => addToCart(item, 1)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${item.name} to cart`}
            >
              <Text className="text-xs font-bold text-white">+ Add</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
