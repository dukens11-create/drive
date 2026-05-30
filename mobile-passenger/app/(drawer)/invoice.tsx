import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function InvoiceScreen() {
  return (
    <PassengerScreen title="Invoice / Receipt" subtitle="Trip fare breakdown and taxes.">
      <Text className="text-zinc-200">Base fare: $8.00 • Tax: $0.80 • Total: $12.80</Text>
    </PassengerScreen>
  );
}
