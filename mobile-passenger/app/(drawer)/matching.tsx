import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function MatchingScreen() {
  return (
    <PassengerScreen title="Matching" subtitle="Searching for driver and estimated wait time.">
      <Text className="text-zinc-200">Dispatch matching in progress...</Text>
    </PassengerScreen>
  );
}
