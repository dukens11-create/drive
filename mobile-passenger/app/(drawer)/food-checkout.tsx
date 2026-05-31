import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { PassengerScreen } from '../../src/components/ui/PassengerScreen';

type PaymentMethod = 'card' | 'wallet' | 'cash';
type DeliveryTime = 'asap' | 'scheduled';

export default function FoodCheckoutScreen() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [deliveryTime, setDeliveryTime] = useState<DeliveryTime>('asap');
  const [scheduledTime, setScheduledTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [tip, setTip] = useState<number>(2);
  const [contactPhone, setContactPhone] = useState('');
  const [placing, setPlacing] = useState(false);

  const CUSTOM_TIPS = [0, 1, 2, 3, 5];

  const handlePlaceOrder = () => {
    if (!address.trim()) return;
    setPlacing(true);
    // Simulate async order placement
    setTimeout(() => {
      setPlacing(false);
      router.replace('/(drawer)/food-order-tracking');
    }, 1200);
  };

  return (
    <PassengerScreen title="Checkout" subtitle="Confirm your delivery details and place your order.">
      {/* Delivery address */}
      <View className="mb-4">
        <Text className="mb-1 text-sm font-semibold text-zinc-300">Delivery Address</Text>
        <TextInput
          className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
          placeholder="Enter your delivery address…"
          placeholderTextColor="#71717a"
          value={address}
          onChangeText={setAddress}
          accessibilityLabel="Delivery address"
        />
        <View className="mt-2 flex-row gap-2">
          {['Home – 123 Main St', 'Work – 456 Office Ave'].map((saved) => (
            <Pressable
              key={saved}
              onPress={() => setAddress(saved.split(' – ')[1] ?? saved)}
              accessibilityRole="button"
              accessibilityLabel={`Use saved address: ${saved}`}
              className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2"
            >
              <Text className="text-xs text-zinc-300">{saved}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Delivery time */}
      <View className="mb-4">
        <Text className="mb-1 text-sm font-semibold text-zinc-300">Delivery Time</Text>
        <View className="flex-row gap-2">
          {(['asap', 'scheduled'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setDeliveryTime(t)}
              accessibilityRole="button"
              accessibilityLabel={t === 'asap' ? 'Deliver as soon as possible' : 'Schedule delivery time'}
              className={`flex-1 rounded-xl py-3 items-center ${deliveryTime === t ? 'bg-emerald-600' : 'bg-zinc-800 border border-zinc-700'}`}
            >
              <Text className={`text-sm font-semibold ${deliveryTime === t ? 'text-white' : 'text-zinc-300'}`}>
                {t === 'asap' ? '⚡ ASAP' : '📅 Schedule'}
              </Text>
            </Pressable>
          ))}
        </View>
        {deliveryTime === 'scheduled' && (
          <TextInput
            className="mt-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
            placeholder="e.g. Today at 7:30 PM"
            placeholderTextColor="#71717a"
            value={scheduledTime}
            onChangeText={setScheduledTime}
            accessibilityLabel="Scheduled delivery time"
          />
        )}
      </View>

      {/* Contact */}
      <View className="mb-4">
        <Text className="mb-1 text-sm font-semibold text-zinc-300">Contact Phone</Text>
        <TextInput
          className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white"
          placeholder="+1 555 000 0000"
          placeholderTextColor="#71717a"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
          accessibilityLabel="Contact phone number"
        />
      </View>

      {/* Payment method */}
      <View className="mb-4">
        <Text className="mb-1 text-sm font-semibold text-zinc-300">Payment Method</Text>
        <View className="flex-row gap-2">
          {([['card', '💳 Card'], ['wallet', '👛 Wallet'], ['cash', '💵 Cash']] as [PaymentMethod, string][]).map(([method, label]) => (
            <Pressable
              key={method}
              onPress={() => setPaymentMethod(method)}
              accessibilityRole="button"
              accessibilityLabel={label}
              className={`flex-1 rounded-xl py-3 items-center ${paymentMethod === method ? 'bg-emerald-600' : 'bg-zinc-800 border border-zinc-700'}`}
            >
              <Text className={`text-xs font-semibold ${paymentMethod === method ? 'text-white' : 'text-zinc-300'}`}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => router.push('/(drawer)/payment-methods')}
          accessibilityRole="button"
          accessibilityLabel="Manage payment methods"
          className="mt-2"
        >
          <Text className="text-xs text-emerald-400">Manage payment methods →</Text>
        </Pressable>
      </View>

      {/* Tip */}
      <View className="mb-4">
        <Text className="mb-1 text-sm font-semibold text-zinc-300">Tip for Driver</Text>
        <View className="flex-row gap-2">
          {CUSTOM_TIPS.map((amount) => (
            <Pressable
              key={amount}
              onPress={() => setTip(amount)}
              accessibilityRole="button"
              accessibilityLabel={amount === 0 ? 'No tip' : `Tip $${amount}`}
              className={`flex-1 rounded-xl py-2 items-center ${tip === amount ? 'bg-emerald-600' : 'bg-zinc-800 border border-zinc-700'}`}
            >
              <Text className={`text-xs font-semibold ${tip === amount ? 'text-white' : 'text-zinc-300'}`}>
                {amount === 0 ? 'None' : `$${amount}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Order summary */}
      <View className="mb-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4 gap-1">
        <View className="flex-row justify-between">
          <Text className="text-sm text-zinc-400">Items</Text>
          <Text className="text-sm text-white">$21.95</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-zinc-400">Delivery fee</Text>
          <Text className="text-sm text-white">$1.99</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-zinc-400">Tip</Text>
          <Text className="text-sm text-white">${tip.toFixed(2)}</Text>
        </View>
        <View className="mt-1 flex-row justify-between border-t border-zinc-700 pt-2">
          <Text className="font-bold text-white">Total</Text>
          <Text className="font-bold text-white">${(21.95 + 1.99 + tip).toFixed(2)}</Text>
        </View>
      </View>

      {/* Place order */}
      <Pressable
        onPress={handlePlaceOrder}
        disabled={placing || !address.trim()}
        accessibilityRole="button"
        accessibilityLabel="Place order"
        className={`rounded-2xl py-4 ${placing || !address.trim() ? 'bg-zinc-700' : 'bg-emerald-600'}`}
      >
        <Text className="text-center text-base font-bold text-white">
          {placing ? 'Placing order…' : 'Place Order'}
        </Text>
      </Pressable>
    </PassengerScreen>
  );
}
