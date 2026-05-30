import { PassengerPortalPage } from '../../../components/passenger-portal-page';

export default async function RideDetailPage({ params }: { params: Promise<{ rideId: string }> }) {
  const { rideId } = await params;
  return <PassengerPortalPage section="rideDetail" rideId={rideId} />;
}
