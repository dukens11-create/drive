'use client';

import { motion } from 'framer-motion';
import { HiMiniArrowPathRoundedSquare, HiMiniMapPin, HiMiniXMark, HiOutlineArrowPath, HiOutlineMapPin } from 'react-icons/hi2';
import { ActionButtons } from './ActionButtons';
import { FareEstimate } from './FareEstimate';
import { LocationInput } from './LocationInput';
import { RideTypeSelector } from './RideTypeSelector';
import type { RideTypeOption } from './types';

export function BookingPanel({
  pickup,
  destination,
  fareLine,
  rideTypes,
  selectedRideType,
  onPickupChange,
  onDestinationChange,
  onSelectRideType,
  onUseCurrentLocation,
  onClearDestination,
  onRequestRide,
  onCancelRide,
}: {
  pickup: string;
  destination: string;
  fareLine: string;
  rideTypes: RideTypeOption[];
  selectedRideType: RideTypeOption['id'];
  onPickupChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onSelectRideType: (id: RideTypeOption['id']) => void;
  onUseCurrentLocation: () => void;
  onClearDestination: () => void;
  onRequestRide: () => void;
  onCancelRide: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08, duration: 0.4, ease: 'easeOut' }}
      className="rounded-[20px] bg-white p-6 shadow-xl shadow-slate-200/70"
    >
      <div className="space-y-5">
        <LocationInput
          label="Pickup"
          icon={<HiOutlineMapPin className="h-5 w-5" />}
          value={pickup}
          onChange={onPickupChange}
          footer={
            <button type="button" onClick={onUseCurrentLocation} className="text-sm font-semibold text-[#3B82F6] transition hover:text-blue-700">
              Use current location
            </button>
          }
          action={
            <button
              type="button"
              onClick={onUseCurrentLocation}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#3B82F6] hover:text-[#3B82F6]"
            >
              <HiOutlineArrowPath className="h-4 w-4" />
              Current location
            </button>
          }
        />

        <LocationInput
          label="Destination"
          icon={<HiMiniMapPin className="h-5 w-5 text-[#DC2626]" />}
          value={destination}
          onChange={onDestinationChange}
          placeholder="Where to?"
          action={
            <button
              type="button"
              onClick={onClearDestination}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="Clear destination"
            >
              <HiMiniXMark className="h-4 w-4" />
            </button>
          }
          footer={
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <HiMiniArrowPathRoundedSquare className="h-4 w-4 text-[#3B82F6]" />
              Route preview refreshes automatically.
            </div>
          }
        />

        <RideTypeSelector options={rideTypes} selectedRideType={selectedRideType} onSelect={onSelectRideType} />
        <FareEstimate value={fareLine} />
        <ActionButtons onRequestRide={onRequestRide} onCancelRide={onCancelRide} />
      </div>
    </motion.section>
  );
}
