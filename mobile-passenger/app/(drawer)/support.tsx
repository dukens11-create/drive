import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function SupportScreen() {
  return (
    <PassengerScreen title="Support / Help" subtitle="Contact support and report issues.">
      <Text className="text-zinc-200">Support email: support@drive.example</Text>
    </PassengerScreen>
  );
}
