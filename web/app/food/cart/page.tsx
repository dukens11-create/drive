import type { Metadata } from 'next';
import { PassengerPortalPage } from '../../../components/passenger-portal-page';

export const metadata: Metadata = {
  title: 'Cart',
  description: 'Review your cart and place your food delivery order.',
};

export default function FoodCartPage() {
  return <PassengerPortalPage section="foodCart" />;
}
