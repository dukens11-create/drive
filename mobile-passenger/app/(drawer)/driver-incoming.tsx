import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function DriverIncomingScreen() {
  return (
    <PassengerScreen title="Driver Incoming" subtitle="Driver details, vehicle info, and tracking.">
      <Text className="text-zinc-200">Driver Alex • Blue Prius • 3 minutes away.</Text>
    </PassengerScreen>
  );
}
