'use client';

import { motion } from 'framer-motion';

export function SearchingSpinner() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 3.2, ease: 'linear' }}
      className="relative flex h-16 w-16 items-center justify-center"
      aria-label="Searching for driver"
    >
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          animate={{ opacity: [0.45, 1, 0.45], scale: [0.92, 1.08, 0.92] }}
          transition={{ repeat: Infinity, duration: 1.4, delay: dot * 0.18, ease: 'easeInOut' }}
          className="absolute h-3.5 w-3.5 rounded-full bg-[#3B82F6] shadow-[0_0_18px_rgba(59,130,246,0.5)]"
          style={{ transform: `rotate(${dot * 120}deg) translateY(-22px)` }}
        />
      ))}
      <span className="h-6 w-6 rounded-full border border-blue-100 bg-white shadow-inner" />
    </motion.div>
  );
}
