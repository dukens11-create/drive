'use client';

import { motion } from 'framer-motion';
import { HiMiniTruck } from 'react-icons/hi2';
import type { RideTypeOption } from './types';

export function RideTypeCard({ option, selected, onSelect }: { option: RideTypeOption; selected: boolean; onSelect: (id: RideTypeOption['id']) => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(option.id)}
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={[
        'flex min-w-0 flex-1 flex-col items-center gap-3 rounded-2xl border px-3 py-4 text-center transition-all duration-200',
        selected
          ? 'border-[#3B82F6] bg-[#EFF6FF] shadow-lg shadow-blue-100'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/70',
      ].join(' ')}
    >
      <span className={['flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-br', option.accent].join(' ')}>
        <HiMiniTruck className={['h-8 w-8', option.iconAccent].join(' ')} />
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-800">{option.label}</p>
        <p className="mt-1 text-xs text-slate-400">{option.description}</p>
      </div>
    </motion.button>
  );
}
