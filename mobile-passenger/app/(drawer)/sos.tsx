import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function SosScreen() {
  return (
    <PassengerScreen title="Emergency SOS" subtitle="Quick contact to support and emergency services.">
      <Text className="text-zinc-200">Emergency hotline: 911</Text>
    </PassengerScreen>
  );
}
