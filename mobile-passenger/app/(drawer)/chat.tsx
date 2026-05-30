import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function ChatScreen() {
  return (
    <PassengerScreen title="In-app Chat" subtitle="Text messages with driver.">
      <Text className="text-zinc-200">Driver: I am arriving at the north entrance.</Text>
    </PassengerScreen>
  );
}
