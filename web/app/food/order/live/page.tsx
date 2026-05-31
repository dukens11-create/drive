import type { Metadata } from 'next';
import { PassengerPortalPage } from '../../../../components/passenger-portal-page';

export const metadata: Metadata = {
  title: 'Live Order Tracking',
  description: 'Track your food delivery driver in real time.',
};

export default function FoodOrderLivePage() {
  return <PassengerPortalPage section="foodOrderLive" />;
}
