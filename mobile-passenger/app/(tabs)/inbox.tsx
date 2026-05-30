import { Redirect } from 'expo-router';

/**
 * Redirects to the passenger support/help screen in the drawer navigation.
 */
export default function PassengerInboxTab() {
  return <Redirect href="/(drawer)/support" />;
}
