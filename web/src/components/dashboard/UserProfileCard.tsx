'use client';

import { motion } from 'framer-motion';
import { HiChevronDown, HiOutlineUser } from 'react-icons/hi2';

export function UserProfileCard() {
  return (
    <motion.section
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="ml-auto flex w-full max-w-[360px] items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-xl shadow-slate-200/80"
    >
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3B82F6] text-white shadow-lg shadow-blue-200">
          <HiOutlineUser className="h-7 w-7" />
        </span>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#3B82F6]">Role: RIDER</p>
          <p className="mt-1 text-sm font-medium text-slate-500">rider@example.com</p>
          <p className="mt-1 text-xs text-slate-400">Rider ID: user_62e01c88445b</p>
        </div>
      </div>
      <button type="button" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Open rider profile menu">
        <HiChevronDown className="h-5 w-5" />
      </button>
    </motion.section>
  );
}
