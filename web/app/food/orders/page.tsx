import type { Metadata } from 'next';
import { PassengerPortalPage } from '../../../components/passenger-portal-page';

export const metadata: Metadata = {
  title: 'Food Order History',
  description: 'View your past food delivery orders and reorder favorites.',
};

export default function FoodOrdersPage() {
  return <PassengerPortalPage section="foodOrders" />;
}
