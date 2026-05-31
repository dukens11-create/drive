import type { Metadata } from 'next';
import { PassengerPortalPage } from '../../components/passenger-portal-page';

export const metadata: Metadata = {
  title: 'Food Delivery',
  description: 'Order food from nearby restaurants with fast delivery to your door.',
};

export default function FoodPage() {
  return <PassengerPortalPage section="food" />;
}
