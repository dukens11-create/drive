import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function RideRequestScreen() {
  return (
    <PassengerScreen title="Ride Request" subtitle="Pickup/dropoff selection and ride type selection.">
      <Text className="text-zinc-200">Use map autocomplete to choose pickup and dropoff.</Text>
    </PassengerScreen>
  );
}
