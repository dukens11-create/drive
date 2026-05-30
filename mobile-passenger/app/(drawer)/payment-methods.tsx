import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function PaymentMethodsScreen() {
  return (
    <PassengerScreen title="Payment Methods" subtitle="Add/edit cards and digital wallets.">
      <Text className="text-zinc-200">Visa •••• 4242</Text>
    </PassengerScreen>
  );
}
