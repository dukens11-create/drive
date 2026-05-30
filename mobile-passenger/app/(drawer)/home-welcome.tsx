import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

import { usePassengerStore } from '../../src/store/passengerStore';

export default function HomeWelcomeScreen() {
  const isFirstTimeUser = usePassengerStore((state) => state.isFirstTimeUser);

  return (
    <PassengerScreen title="Home Welcome" subtitle="First-time user experience.">
      <Text className="text-zinc-200">{isFirstTimeUser ? 'Welcome to your first trip!' : 'Welcome back!'}</Text>
    </PassengerScreen>
  );
}
