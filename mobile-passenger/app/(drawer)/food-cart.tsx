import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { usePassengerStore } from '../../src/store/passengerStore';

type CartItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

// Minimal sample cart state shared via module scope for demonstration.
// In a production app this would live in a shared Zustand store slice so that
// items added on the restaurant-detail screen are visible here without prop drilling.
const DEMO_CART: CartItem[] = [
  { id: 'm1', name: 'Margherita', price: 12.99, qty: 1 },
  { id: 'm5', name: 'Garlic Bread', price: 4.99, qty: 2 },
  { id: 'm6', name: 'Cola', price: 1.99, qty: 2 },
];

export default function FoodCartScreen() {
  const router = useRouter();
  const { activePromoCode, setPromoCode } = usePassengerStore();
  const [items, setItems] = useState<CartItem[]>(DEMO_CART);
  const [promoInput, setPromoInput] = useState(activePromoCode);
  const [promoApplied, setPromoApplied] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('');

  const updateQty = (id: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0),
    );
  };

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const deliveryFee = 1.99;
  const discount = promoApplied ? subtotal * 0.2 : 0;
  const total = subtotal + deliveryFee - discount;

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (code === 'FIRST20' || code === 'SAVE10') {
      setPromoCode(code);
      setPromoApplied(true);
    }
  };

  return (
    <PassengerScreen title="Your Cart" subtitle="Review items before checkout.">
      {items.length === 0 ? (
        <View className="items-center py-8">
          <Text className="text-zinc-400">Your cart is empty.</Text>
          <Pressable
            onPress={() => router.push('/(drawer)/(tabs)/food')}
            accessibilityRole="button"
            className="mt-4 rounded-xl bg-emerald-600 px-6 py-3"
          >
            <Text className="font-bold text-white">Browse Restaurants</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Line items */}
          {items.map((item) => (
            <View key={item.id} className="mb-3 flex-row items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900 p-3">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white">{item.name}</Text>
                <Text className="text-xs text-zinc-400">${item.price.toFixed(2)} each</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => updateQty(item.id, -1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove one ${item.name}`}
                  className="h-8 w-8 items-center justify-center rounded-full bg-zinc-700"
                >
                  <Text className="font-bold text-white">−</Text>
                </Pressable>
                <Text className="w-5 text-center text-white">{item.qty}</Text>
                <Pressable
                  onPress={() => updateQty(item.id, 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add one more ${item.name}`}
                  className="h-8 w-8 items-center justify-center rounded-full bg-emerald-600"
                >
                  <Text className="font-bold text-white">+</Text>
                </Pressable>
                <Text className="ml-2 w-14 text-right text-sm font-semibold text-emerald-400">
                  ${(item.price * item.qty).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}

          {/* Special instructions */}
          <TextInput
            className="mb-3 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
            placeholder="Special delivery instructions…"
            placeholderTextColor="#71717a"
            value={deliveryNote}
            onChangeText={setDeliveryNote}
            accessibilityLabel="Special delivery instructions"
            multiline
            numberOfLines={2}
          />

          {/* Promo code */}
          <View className="mb-3 flex-row gap-2">
            <TextInput
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
              placeholder="Promo code"
              placeholderTextColor="#71717a"
              value={promoInput}
              onChangeText={setPromoInput}
              autoCapitalize="characters"
              accessibilityLabel="Promo code input"
            />
            <Pressable
              onPress={applyPromo}
              accessibilityRole="button"
              accessibilityLabel="Apply promo code"
              className="rounded-xl bg-zinc-700 px-4 py-3"
            >
              <Text className="font-semibold text-white">Apply</Text>
            </Pressable>
          </View>
          {promoApplied && (
            <Text className="mb-2 text-sm text-emerald-400">✓ Promo applied — 20% off!</Text>
          )}

          {/* Order summary */}
          <View className="mb-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4 gap-1">
            <View className="flex-row justify-between">
              <Text className="text-sm text-zinc-400">Subtotal</Text>
              <Text className="text-sm text-white">${subtotal.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm text-zinc-400">Delivery fee</Text>
              <Text className="text-sm text-white">${deliveryFee.toFixed(2)}</Text>
            </View>
            {discount > 0 && (
              <View className="flex-row justify-between">
                <Text className="text-sm text-emerald-400">Discount</Text>
                <Text className="text-sm text-emerald-400">−${discount.toFixed(2)}</Text>
              </View>
            )}
            <View className="mt-1 flex-row justify-between border-t border-zinc-700 pt-2">
              <Text className="font-bold text-white">Total</Text>
              <Text className="font-bold text-white">${total.toFixed(2)}</Text>
            </View>
          </View>

          {/* Checkout CTA */}
          <Pressable
            onPress={() => router.push('/(drawer)/food-checkout')}
            accessibilityRole="button"
            accessibilityLabel="Proceed to checkout"
            className="rounded-2xl bg-emerald-600 py-4"
          >
            <Text className="text-center text-base font-bold text-white">Proceed to Checkout</Text>
          </Pressable>
        </>
      )}
    </PassengerScreen>
  );
}
