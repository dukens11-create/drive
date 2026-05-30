import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function LiveRideTrackingScreen() {
  return (
    <PassengerScreen title="Live Ride Tracking" subtitle="Driver location, ETA, driver info, and route.">
      <Text className="text-zinc-200">Realtime updates powered by sockets and map overlays.</Text>
    </PassengerScreen>
  );
}
