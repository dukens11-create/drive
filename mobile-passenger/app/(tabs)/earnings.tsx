import { Redirect } from 'expo-router';

/**
 * Redirects to the passenger wallet/payments tab in the drawer navigation.
 */
export default function PassengerPaymentsTab() {
  return <Redirect href="/(drawer)/(tabs)/wallet" />;
}
