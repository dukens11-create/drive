import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { usePassengerStore } from '../../src/store/passengerStore';

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  allergens?: string[];
  calories?: number;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'm1', name: 'Margherita', description: 'Classic tomato, mozzarella, basil', price: 12.99, category: 'Pizzas', calories: 800 },
  { id: 'm2', name: 'Pepperoni Feast', description: 'Loaded pepperoni with extra cheese', price: 14.99, category: 'Pizzas', allergens: ['Dairy', 'Gluten'], calories: 950 },
  { id: 'm3', name: 'BBQ Chicken Pizza', description: 'Smoky BBQ sauce, grilled chicken, red onion', price: 15.99, category: 'Pizzas', allergens: ['Gluten'], calories: 880 },
  { id: 'm4', name: 'Caesar Salad', description: 'Romaine, parmesan, croutons, Caesar dressing', price: 8.99, category: 'Sides', allergens: ['Dairy', 'Gluten', 'Fish'], calories: 320 },
  { id: 'm5', name: 'Garlic Bread', description: 'Toasted with herb butter', price: 4.99, category: 'Sides', allergens: ['Dairy', 'Gluten'], calories: 260 },
  { id: 'm6', name: 'Cola', description: '330ml can', price: 1.99, category: 'Drinks', calories: 140 },
  { id: 'm7', name: 'Water', description: '500ml still water', price: 1.49, category: 'Drinks', calories: 0 },
];

const CATEGORIES = [...new Set(MENU_ITEMS.map((m) => m.category))];

export default function FoodRestaurantDetailScreen() {
  const { name } = useLocalSearchParams<{ id: string; name: string }>();
  const router = useRouter();
  const { setPromoCode } = usePassengerStore();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  const addToCart = (itemId: string) => {
    // NOTE: In production, cart mutations would go through a shared Zustand slice
    // so the cart total is consistent across all screens (detail, cart, checkout).
    setCart((prev) => ({ ...prev, [itemId]: (prev[itemId] ?? 0) + 1 }));
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const qty = (prev[itemId] ?? 0) - 1;
      if (qty <= 0) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: qty };
    });
  };

  const cartTotal = MENU_ITEMS.reduce((sum, item) => sum + item.price * (cart[item.id] ?? 0), 0);
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  const itemsByCategory = MENU_ITEMS.filter((m) => m.category === activeCategory);

  return (
    <PassengerScreen title={name ?? 'Restaurant'} subtitle="Browse the menu and add items to your cart.">
      {/* Promo strip */}
      <Pressable
        onPress={() => {
          setPromoCode('FIRST20');
          router.push('/(drawer)/promo-code');
        }}
        accessibilityRole="button"
        accessibilityLabel="Apply first order promo code"
        className="mb-3 rounded-xl bg-amber-700 px-4 py-2"
      >
        <Text className="text-center text-sm font-bold text-white">🎉 20% off your first order — tap to apply</Text>
      </Pressable>

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 -mx-1">
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setActiveCategory(cat)}
            accessibilityRole="button"
            accessibilityLabel={cat}
            className={`mr-2 rounded-full px-4 py-2 ${activeCategory === cat ? 'bg-emerald-600' : 'bg-zinc-800 border border-zinc-700'}`}
          >
            <Text className={`text-sm font-semibold ${activeCategory === cat ? 'text-white' : 'text-zinc-300'}`}>{cat}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Menu items */}
      {itemsByCategory.map((item) => (
        <View key={item.id} className="mb-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-base font-bold text-white">{item.name}</Text>
              <Text className="mt-0.5 text-sm text-zinc-400">{item.description}</Text>
              {item.allergens && item.allergens.length > 0 && (
                <Text className="mt-1 text-xs text-amber-400">⚠ {item.allergens.join(', ')}</Text>
              )}
              {item.calories != null && (
                <Text className="mt-0.5 text-xs text-zinc-500">{item.calories} kcal</Text>
              )}
              <Text className="mt-2 text-sm font-semibold text-emerald-400">${item.price.toFixed(2)}</Text>
            </View>
            <View className="flex-row items-center gap-2">
              {(cart[item.id] ?? 0) > 0 && (
                <>
                  <Pressable
                    onPress={() => removeFromCart(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove one ${item.name}`}
                    className="h-8 w-8 items-center justify-center rounded-full bg-zinc-700"
                  >
                    <Text className="text-white font-bold">−</Text>
                  </Pressable>
                  <Text className="w-5 text-center text-white font-semibold">{cart[item.id]}</Text>
                </>
              )}
              <Pressable
                onPress={() => addToCart(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${item.name} to cart`}
                className="h-8 w-8 items-center justify-center rounded-full bg-emerald-600"
              >
                <Text className="text-white font-bold">+</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}

      {/* Cart CTA */}
      {cartCount > 0 && (
        <Pressable
          onPress={() => router.push('/(drawer)/food-cart')}
          accessibilityRole="button"
          accessibilityLabel={`View cart with ${cartCount} items`}
          className="mt-2 rounded-2xl bg-emerald-600 px-6 py-4"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-white">{cartCount} item{cartCount !== 1 ? 's' : ''} in cart</Text>
            <Text className="text-base font-bold text-white">${cartTotal.toFixed(2)} →</Text>
          </View>
        </Pressable>
      )}
    </PassengerScreen>
  );
}
