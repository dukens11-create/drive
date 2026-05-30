import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function InTripScreen() {
  return (
    <PassengerScreen title="In-Trip" subtitle="Live route tracking, ETA, and driver contact.">
      <Text className="text-zinc-200">Trip currently in progress.</Text>
    </PassengerScreen>
  );
}
