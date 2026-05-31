import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useFoodStore } from '../../src/store/foodStore';

const TIP_OPTIONS = [
  { label: 'No Tip', value: 0 },
  { label: '10%', value: 0.1 },
  { label: '15%', value: 0.15 },
  { label: '20%', value: 0.2 },
];

export default function FoodCartScreen() {
  const router = useRouter();
  const { cart, activeRestaurant, promoCode, tip, cartSubtotal, updateQuantity, removeFromCart, setPromoCode, setTip } = useFoodStore();
  const [promoInput, setPromoInput] = useState(promoCode);
  const [selectedTipOption, setSelectedTipOption] = useState<number | null>(0);

  const subtotal = cartSubtotal();
  const deliveryFee = activeRestaurant?.deliveryFee ?? 0;
  const tax = subtotal * 0.08;
  const tipAmount = selectedTipOption !== null ? subtotal * (TIP_OPTIONS[selectedTipOption]?.value ?? 0) : tip;
  const total = subtotal + deliveryFee + tax + tipAmount;

  if (cart.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-zinc-950 px-8">
        <Text className="text-4xl">🛒</Text>
        <Text className="mt-4 text-xl font-bold text-white">Your cart is empty</Text>
        <Text className="mt-2 text-center text-sm text-zinc-400">Add items from a restaurant to start your order</Text>
        <Pressable
          className="mt-6 rounded-2xl bg-emerald-600 px-6 py-3"
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Browse restaurants"
        >
          <Text className="font-bold text-white">Browse Restaurants</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zinc-950">
      <View className="flex-row items-center px-5 pb-2 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" className="mr-3">
          <Text className="text-base font-bold text-emerald-400">← Back</Text>
        </Pressable>
        <Text className="text-xl font-bold text-white">Your Cart</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
        <Text className="mb-3 mt-2 text-sm font-semibold text-zinc-400">{activeRestaurant?.name}</Text>

        <View className="gap-3">
          {cart.map((cartItem) => (
            <View key={cartItem.id} className="flex-row items-center rounded-2xl bg-zinc-900 p-4">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white">{cartItem.menuItem.name}</Text>
                {cartItem.specialInstructions ? <Text className="mt-0.5 text-xs text-zinc-400">{cartItem.specialInstructions}</Text> : null}
                <Text className="mt-1 text-base font-bold text-emerald-400">${cartItem.subtotal.toFixed(2)}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Pressable
                  className="h-8 w-8 items-center justify-center rounded-full bg-zinc-800"
                  onPress={() => updateQuantity(cartItem.id, cartItem.quantity - 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Decrease quantity of ${cartItem.menuItem.name}`}
                >
                  <Text className="font-bold text-white">−</Text>
                </Pressable>
                <Text className="w-6 text-center text-sm font-bold text-white">{cartItem.quantity}</Text>
                <Pressable
                  className="h-8 w-8 items-center justify-center rounded-full bg-emerald-700"
                  onPress={() => updateQuantity(cartItem.id, cartItem.quantity + 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Increase quantity of ${cartItem.menuItem.name}`}
                >
                  <Text className="font-bold text-white">+</Text>
                </Pressable>
                <Pressable
                  className="ml-2"
                  onPress={() => removeFromCart(cartItem.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${cartItem.menuItem.name} from cart`}
                >
                  <Text className="text-rose-400">🗑️</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View className="mt-4 rounded-2xl bg-zinc-900 p-4">
          <Text className="text-sm font-semibold text-white">Promo Code</Text>
          <View className="mt-2 flex-row gap-2">
            <TextInput
              value={promoInput}
              onChangeText={setPromoInput}
              placeholder="Enter promo code"
              placeholderTextColor="#52525B"
              className="flex-1 rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white"
              autoCapitalize="characters"
              accessibilityLabel="Promo code input"
            />
            <Pressable
              className="rounded-xl bg-emerald-700 px-4 py-2"
              onPress={() => setPromoCode(promoInput)}
              accessibilityRole="button"
              accessibilityLabel="Apply promo code"
            >
              <Text className="text-sm font-semibold text-white">Apply</Text>
            </Pressable>
          </View>
        </View>

        <View className="mt-4 rounded-2xl bg-zinc-900 p-4">
          <Text className="mb-3 text-sm font-semibold text-white">Add Tip</Text>
          <View className="flex-row gap-2">
            {TIP_OPTIONS.map((option, index) => (
              <Pressable
                key={option.label}
                className={`flex-1 rounded-xl py-2 ${selectedTipOption === index ? 'bg-emerald-600' : 'bg-zinc-800'}`}
                onPress={() => {
                  setSelectedTipOption(index);
                  setTip(subtotal * option.value);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedTipOption === index }}
                accessibilityLabel={`Tip ${option.label}`}
              >
                <Text className={`text-center text-xs font-semibold ${selectedTipOption === index ? 'text-white' : 'text-zinc-300'}`}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="mt-4 gap-2 rounded-2xl bg-zinc-900 p-4">
          <Text className="text-sm font-semibold text-white">Order Summary</Text>
          <View className="flex-row justify-between">
            <Text className="text-sm text-zinc-400">Subtotal</Text>
            <Text className="text-sm text-zinc-200">${subtotal.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-zinc-400">Delivery fee</Text>
            <Text className="text-sm text-zinc-200">${deliveryFee.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-zinc-400">Tax (8%)</Text>
            <Text className="text-sm text-zinc-200">${tax.toFixed(2)}</Text>
          </View>
          {tipAmount > 0 ? (
            <View className="flex-row justify-between">
              <Text className="text-sm text-zinc-400">Tip</Text>
              <Text className="text-sm text-zinc-200">${tipAmount.toFixed(2)}</Text>
            </View>
          ) : null}
          <View className="mt-1 flex-row justify-between border-t border-zinc-700 pt-2">
            <Text className="text-base font-bold text-white">Total</Text>
            <Text className="text-base font-bold text-emerald-400">${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950 px-5 py-4">
        <Pressable
          className="rounded-2xl bg-emerald-600 py-4"
          onPress={() => router.push('/(drawer)/food-checkout')}
          accessibilityRole="button"
          accessibilityLabel="Proceed to checkout"
        >
          <Text className="text-center font-bold text-white">Proceed to Checkout · ${total.toFixed(2)}</Text>
        </Pressable>
      </View>
    </View>
  );
}
