import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useFoodStore } from '../../src/store/foodStore';

const SAVED_ADDRESSES = [
  { id: 'addr-1', label: 'Home', address: '123 Home St, San Francisco, CA' },
  { id: 'addr-2', label: 'Work', address: '456 Office Blvd, San Francisco, CA' },
];

export default function FoodCheckoutScreen() {
  const router = useRouter();
  const {
    activeRestaurant,
    cart,
    promoCode,
    tip,
    cartSubtotal,
    deliveryInstructions,
    setDeliveryAddress,
    setDeliveryInstructions,
    clearCart,
  } = useFoodStore();
  const [selectedAddress, setSelectedAddress] = useState('addr-1');
  const [deliveryTime, setDeliveryTime] = useState<'asap' | 'scheduled'>('asap');
  const [specialNote, setSpecialNote] = useState(deliveryInstructions);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const subtotal = cartSubtotal();
  const deliveryFee = activeRestaurant?.deliveryFee ?? 0;
  const tax = subtotal * 0.08;
  const total = subtotal + deliveryFee + tax + tip;

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    const address = SAVED_ADDRESSES.find((entry) => entry.id === selectedAddress)?.address ?? '';
    setDeliveryAddress(address);
    setDeliveryInstructions(specialNote);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsPlacingOrder(false);
    clearCart();
    router.push({ pathname: '/(drawer)/food-order-tracking', params: { orderId: `ord-${Date.now()}` } });
  };

  return (
    <View className="flex-1 bg-zinc-950">
      <View className="flex-row items-center px-5 pb-2 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" className="mr-3">
          <Text className="text-base font-bold text-emerald-400">← Back</Text>
        </Pressable>
        <Text className="text-xl font-bold text-white">Checkout</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140, gap: 16 }}>
        <View className="rounded-2xl bg-zinc-900 p-4">
          <Text className="text-sm font-semibold text-white">Delivery Address</Text>
          <View className="mt-3 gap-2">
            {SAVED_ADDRESSES.map((address) => (
              <Pressable
                key={address.id}
                className={`flex-row items-center rounded-xl p-3 ${selectedAddress === address.id ? 'border border-emerald-600 bg-emerald-900/40' : 'bg-zinc-800'}`}
                onPress={() => setSelectedAddress(address.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedAddress === address.id }}
                accessibilityLabel={`${address.label} address`}
              >
                <View className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${selectedAddress === address.id ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-500'}`}>
                  {selectedAddress === address.id ? <View className="h-2 w-2 rounded-full bg-white" /> : null}
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-white">{address.label}</Text>
                  <Text className="text-xs text-zinc-400">{address.address}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="rounded-2xl bg-zinc-900 p-4">
          <Text className="text-sm font-semibold text-white">Delivery Time</Text>
          <View className="mt-3 flex-row gap-2">
            <Pressable
              className={`flex-1 rounded-xl py-2.5 ${deliveryTime === 'asap' ? 'bg-emerald-600' : 'bg-zinc-800'}`}
              onPress={() => setDeliveryTime('asap')}
              accessibilityRole="radio"
              accessibilityState={{ checked: deliveryTime === 'asap' }}
              accessibilityLabel="Deliver as soon as possible"
            >
              <Text className={`text-center text-sm font-semibold ${deliveryTime === 'asap' ? 'text-white' : 'text-zinc-300'}`}>
                ASAP ({activeRestaurant?.deliveryTimeMinutes ?? 30} min)
              </Text>
            </Pressable>
            <Pressable
              className={`flex-1 rounded-xl py-2.5 ${deliveryTime === 'scheduled' ? 'bg-emerald-600' : 'bg-zinc-800'}`}
              onPress={() => setDeliveryTime('scheduled')}
              accessibilityRole="radio"
              accessibilityState={{ checked: deliveryTime === 'scheduled' }}
              accessibilityLabel="Schedule delivery later"
            >
              <Text className={`text-center text-sm font-semibold ${deliveryTime === 'scheduled' ? 'text-white' : 'text-zinc-300'}`}>Schedule Later</Text>
            </Pressable>
          </View>
        </View>

        <View className="rounded-2xl bg-zinc-900 p-4">
          <Text className="text-sm font-semibold text-white">Delivery Instructions</Text>
          <View className="mt-2 flex-row flex-wrap gap-2">
            {['Leave at door', 'Ring doorbell', 'Call on arrival'].map((option) => (
              <Pressable
                key={option}
                className={`rounded-full px-3 py-1.5 ${specialNote === option ? 'bg-emerald-700' : 'bg-zinc-800'}`}
                onPress={() => setSpecialNote(specialNote === option ? '' : option)}
                accessibilityRole="button"
                accessibilityLabel={option}
              >
                <Text className={`text-xs ${specialNote === option ? 'font-semibold text-white' : 'text-zinc-300'}`}>{option}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={specialNote}
            onChangeText={setSpecialNote}
            placeholder="Add special instructions..."
            placeholderTextColor="#52525B"
            multiline
            numberOfLines={3}
            className="mt-3 rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white"
            accessibilityLabel="Delivery instructions"
          />
        </View>

        <View className="rounded-2xl bg-zinc-900 p-4">
          <Text className="mb-3 text-sm font-semibold text-white">Order Review</Text>
          {cart.map((item) => (
            <View key={item.id} className="flex-row justify-between py-1">
              <Text className="text-sm text-zinc-300">{item.quantity}× {item.menuItem.name}</Text>
              <Text className="text-sm text-zinc-200">${item.subtotal.toFixed(2)}</Text>
            </View>
          ))}
          <View className="mt-2 gap-1 border-t border-zinc-700 pt-2">
            <View className="flex-row justify-between">
              <Text className="text-xs text-zinc-500">Subtotal</Text>
              <Text className="text-xs text-zinc-400">${subtotal.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-zinc-500">Delivery + Tax</Text>
              <Text className="text-xs text-zinc-400">${(deliveryFee + tax).toFixed(2)}</Text>
            </View>
            {promoCode ? (
              <View className="flex-row justify-between">
                <Text className="text-xs text-emerald-400">Promo: {promoCode}</Text>
                <Text className="text-xs text-emerald-400">Applied</Text>
              </View>
            ) : null}
            <View className="flex-row justify-between pt-1">
              <Text className="text-base font-bold text-white">Total</Text>
              <Text className="text-base font-bold text-emerald-400">${total.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950 px-5 py-4">
        <Pressable
          className={`rounded-2xl py-4 ${isPlacingOrder ? 'bg-emerald-800' : 'bg-emerald-600'}`}
          onPress={() => void handlePlaceOrder()}
          disabled={isPlacingOrder}
          accessibilityRole="button"
          accessibilityLabel="Place order"
        >
          <Text className="text-center font-bold text-white">{isPlacingOrder ? 'Placing Order…' : `Place Order · $${total.toFixed(2)}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}
