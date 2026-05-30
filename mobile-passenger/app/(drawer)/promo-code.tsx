import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text, TextInput, View } from 'react-native';

import { usePassengerStore } from '../../src/store/passengerStore';

export default function PromoCodeScreen() {
  const activePromoCode = usePassengerStore((state) => state.activePromoCode);
  const setPromoCode = usePassengerStore((state) => state.setPromoCode);

  return (
    <PassengerScreen title="Promo Code" subtitle="Apply discount codes.">
      <TextInput
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
        value={activePromoCode}
        onChangeText={setPromoCode}
        placeholder="SAVE10"
        placeholderTextColor="#9CA3AF"
      />
      <View className="mt-3">
        <Text className="text-zinc-200">Current code: {activePromoCode || 'None'}</Text>
      </View>
    </PassengerScreen>
  );
}
