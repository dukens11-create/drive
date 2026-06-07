'use client';

import { motion } from 'framer-motion';
import { HiMiniTruck } from 'react-icons/hi2';

export function ActionButtons({ onRequestRide, onCancelRide }: { onRequestRide: () => void; onCancelRide: () => void }) {
  return (
    <div className="grid gap-3">
      <motion.button
        type="button"
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.99 }}
        onClick={onRequestRide}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition"
      >
        <HiMiniTruck className="h-5 w-5" />
        <span>Request ride</span>
      </motion.button>
      <motion.button
        type="button"
        whileHover={{ scale: 1.02, y: -1 }}
        whileTap={{ scale: 0.99 }}
        onClick={onCancelRide}
        className="min-h-14 w-full rounded-2xl border border-[#DC2626] bg-white px-5 py-3 text-sm font-semibold text-[#DC2626] shadow-sm transition hover:shadow-md"
      >
        Cancel ride
      </motion.button>
    </div>
  );
}
