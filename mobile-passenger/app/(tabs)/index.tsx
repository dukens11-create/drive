import { Redirect } from 'expo-router';

/**
 * Passenger root tab home – redirects to the drawer-based passenger home.
 * The primary passenger navigation lives at /(drawer)/(tabs)/dashboard.
 */
export default function PassengerTabHome() {
  return <Redirect href="/(drawer)/(tabs)/dashboard" />;
}
