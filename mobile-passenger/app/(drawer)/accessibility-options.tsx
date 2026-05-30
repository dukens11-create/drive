import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function AccessibilityOptionsScreen() {
  return (
    <PassengerScreen title="Accessibility Options" subtitle="Text-to-speech and high contrast mode.">
      <Text className="text-zinc-200">Accessibility controls are available from profile preferences.</Text>
    </PassengerScreen>
  );
}
