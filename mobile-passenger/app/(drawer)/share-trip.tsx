import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function ShareTripScreen() {
  return (
    <PassengerScreen title="Share Trip" subtitle="Share trip details with trusted contacts.">
      <Text className="text-zinc-200">Live trip link: https://drive.example/trip/demo</Text>
    </PassengerScreen>
  );
}
