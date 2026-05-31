import { Redirect } from 'expo-router';

/**
 * Redirects to the passenger ride-history tab in the drawer navigation.
 */
export default function PassengerTripsTab() {
  return <Redirect href="/(drawer)/(tabs)/history" />;
}
