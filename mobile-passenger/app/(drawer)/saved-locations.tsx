import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function SavedLocationsScreen() {
  return (
    <PassengerScreen title="Saved Locations" subtitle="Home, work, and favorites.">
      <Text className="text-zinc-200">Home • Work • Gym</Text>
    </PassengerScreen>
  );
}
