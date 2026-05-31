import { Redirect } from 'expo-router';

/**
 * Redirects to the passenger profile tab in the drawer navigation.
 */
export default function PassengerProfileTab() {
  return <Redirect href="/(drawer)/(tabs)/profile" />;
}
