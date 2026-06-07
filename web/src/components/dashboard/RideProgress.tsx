'use client';

import { motion } from 'framer-motion';
import { HiMiniCheck, HiMiniFlag, HiMiniMagnifyingGlass, HiMiniTruck, HiMiniUser } from 'react-icons/hi2';
import { SearchingSpinner } from './SearchingSpinner';
import type { RideStep } from './types';

const steps: RideStep[] = [
  { id: 'searching', label: 'Searching for driver', icon: HiMiniMagnifyingGlass },
  { id: 'assigned', label: 'Driver assigned', icon: HiMiniUser },
  { id: 'arriving', label: 'Driver arriving', icon: HiMiniTruck },
  { id: 'started', label: 'Ride started', icon: HiMiniFlag },
  { id: 'completed', label: 'Ride completed', icon: HiMiniCheck },
];

export function RideProgress({ cancelled }: { cancelled: boolean }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.4 }}
      className="rounded-[20px] bg-white p-6 shadow-xl shadow-slate-200/70"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Live ride status</h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#3B82F6]">
            {cancelled ? 'Cancelled' : 'Searching'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {cancelled ? 'Status: ride request cancelled' : 'Status: searching for driver'}
          </p>
        </div>
        {!cancelled ? <SearchingSpinner /> : null}
      </div>

      <div className="relative mt-6 overflow-x-auto pb-2">
        <div className="absolute left-6 right-6 top-5 h-1 rounded-full bg-[#DBEAFE]" />
        <div className="absolute left-6 top-5 h-1 w-[18%] rounded-full bg-[#3B82F6]" />
        <div className="grid min-w-[680px] grid-cols-5 gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === 0 && !cancelled;
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center text-center">
                <motion.span
                  animate={isActive ? { boxShadow: ['0 0 0px rgba(59,130,246,0.25)', '0 0 18px rgba(59,130,246,0.45)', '0 0 0px rgba(59,130,246,0.25)'] } : undefined}
                  transition={isActive ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } : undefined}
                  className={[
                    'flex h-10 w-10 items-center justify-center rounded-full border text-sm',
                    isActive
                      ? 'border-[#3B82F6] bg-[#3B82F6] text-white'
                      : 'border-[#BFDBFE] bg-[#EFF6FF] text-[#3B82F6]',
                  ].join(' ')}
                >
                  <Icon className="h-4.5 w-4.5" />
                </motion.span>
                <p className="mt-3 text-xs font-medium leading-5 text-slate-500">{step.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-500">
        {cancelled
          ? 'Your current request has been cancelled. Update the booking details whenever you are ready to request another ride.'
          : 'We\'re finding the best driver for you. This may take a few seconds. You will receive a notification once a driver is assigned.'}
      </p>
    </motion.section>
  );
}
