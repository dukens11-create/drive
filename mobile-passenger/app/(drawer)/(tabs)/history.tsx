import { PassengerScreen } from '../../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function HistoryScreen() {
  return (
    <PassengerScreen title="Ride History" subtitle="Completed rides, ride details, and receipts.">
      <Text className="text-zinc-200">No rides yet in this sandbox account.</Text>
    </PassengerScreen>
  );
}
