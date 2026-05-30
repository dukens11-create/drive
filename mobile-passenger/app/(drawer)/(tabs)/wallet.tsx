import { useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { PassengerScreen } from '../../../src/components/ui/PassengerScreen';

export default function WalletScreen() {
  const router = useRouter();

  return (
    <PassengerScreen title="Payment / Wallet" subtitle="Methods, transactions, and balance.">
      <Text className="text-zinc-100">Current balance: $42.00</Text>
      <Pressable onPress={() => router.push('/(drawer)/payment-methods')} accessibilityRole="button">
        <Text className="mt-3 font-semibold text-emerald-400">Manage Payment Methods</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/(drawer)/promo-code')} accessibilityRole="button">
        <Text className="mt-3 font-semibold text-emerald-400">Apply Promo Code</Text>
      </Pressable>
    </PassengerScreen>
  );
}
