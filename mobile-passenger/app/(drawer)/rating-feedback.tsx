import { PassengerScreen } from '../../src/components/ui/PassengerScreen';
import { Text } from 'react-native';

export default function RatingFeedbackScreen() {
  return (
    <PassengerScreen title="Rating & Feedback" subtitle="Rate driver, tip option, and leave feedback.">
      <Text className="text-zinc-200">Thanks for riding with Drive.</Text>
    </PassengerScreen>
  );
}
