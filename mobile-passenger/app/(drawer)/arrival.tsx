import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function ArrivalScreen() {
  return (
    <PassengerScreen title="Arrival" subtitle="Driver has arrived and waiting for pickup confirmation.">
      <Text className="text-zinc-200">Confirm pickup when you are ready.</Text>
    </PassengerScreen>
  );
}
