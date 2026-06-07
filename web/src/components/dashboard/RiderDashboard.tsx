'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { BookingPanel } from './BookingPanel';
import { MapContainer } from './MapContainer';
import { RideProgress } from './RideProgress';
import { Sidebar } from './Sidebar';
import { UserProfileCard } from './UserProfileCard';
import type { RideTypeOption } from './types';

const initialPickup = '39.62084, -119.67590';
const initialDestination = 'sacramento';

const rideTypes: RideTypeOption[] = [
  {
    id: 'economy',
    label: 'Economy',
    description: 'Affordable daily ride',
    fareLine: '$9.89 • 3.2 mi • 11 min',
    accent: 'from-blue-100 to-blue-200',
    iconAccent: 'text-[#3B82F6]',
  },
  {
    id: 'comfort',
    label: 'Comfort',
    description: 'Extra legroom and quiet trip',
    fareLine: '$13.49 • 3.2 mi • 10 min',
    accent: 'from-slate-100 to-slate-200',
    iconAccent: 'text-slate-500',
  },
  {
    id: 'premium',
    label: 'Premium',
    description: 'Luxury ride with top drivers',
    fareLine: '$18.95 • 3.2 mi • 9 min',
    accent: 'from-slate-800 to-slate-950',
    iconAccent: 'text-white',
  },
];

export function RiderDashboard() {
  const [pickup, setPickup] = useState(initialPickup);
  const [destination, setDestination] = useState(initialDestination);
  const [selectedRideType, setSelectedRideType] = useState<RideTypeOption['id']>('economy');
  const [cancelled, setCancelled] = useState(false);

  const currentRide = useMemo(
    () => rideTypes.find((ride) => ride.id === selectedRideType) ?? rideTypes[0],
    [selectedRideType],
  );

  return (
    <div className="min-h-screen bg-[#F5F7FB] p-4 text-slate-900 sm:p-6 xl:p-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 xl:flex-row">
        <Sidebar activeItem="Rider" />

        <main className="min-w-0 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),360px] lg:items-start">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#1F2937]">Rider dashboard</h2>
                <p className="mt-2 text-sm font-medium text-[#6B7280]">Book and track your ride</p>
              </div>
              <UserProfileCard />
            </div>

            <div className="grid gap-6 2xl:grid-cols-[440px,minmax(0,1fr)]">
              <BookingPanel
                pickup={pickup}
                destination={destination}
                fareLine={currentRide.fareLine}
                rideTypes={rideTypes}
                selectedRideType={selectedRideType}
                onPickupChange={setPickup}
                onDestinationChange={(value) => {
                  setDestination(value);
                  if (cancelled) setCancelled(false);
                }}
                onSelectRideType={(value) => {
                  setSelectedRideType(value);
                  if (cancelled) setCancelled(false);
                }}
                onUseCurrentLocation={() => {
                  setPickup(initialPickup);
                  setCancelled(false);
                }}
                onClearDestination={() => setDestination('')}
                onRequestRide={() => setCancelled(false)}
                onCancelRide={() => setCancelled(true)}
              />

              <div className="space-y-6">
                <MapContainer />
                <RideProgress cancelled={cancelled} />
              </div>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
