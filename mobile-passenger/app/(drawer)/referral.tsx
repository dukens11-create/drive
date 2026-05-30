import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function ReferralScreen() {
  return (
    <PassengerScreen title="Referral" subtitle="Share referral link and earn rewards.">
      <Text className="text-zinc-200">Referral code: DRIVE-PASSENGER</Text>
    </PassengerScreen>
  );
}
