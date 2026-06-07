'use client';

import { motion } from 'framer-motion';
import { HiMiniInformationCircle, HiOutlineShieldCheck } from 'react-icons/hi2';

export function FareEstimate({ value }: { value: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between gap-4 rounded-2xl bg-[#EFF6FF] px-4 py-4"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#3B82F6] shadow-sm shadow-blue-100">
          <HiOutlineShieldCheck className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#3B82F6]">Fare estimate</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
        </div>
      </div>
      <HiMiniInformationCircle className="h-5 w-5 text-slate-400" />
    </motion.div>
  );
}
