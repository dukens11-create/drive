'use client';

import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { HiMinus, HiPlus } from 'react-icons/hi2';

function buildMapUrl(zoomLevel: number) {
  const base = 0.45 / zoomLevel;
  const west = (-121.4944 - base).toFixed(4);
  const east = (-119.6759 + base).toFixed(4);
  const south = (38.5816 - base).toFixed(4);
  const north = (39.62084 + base).toFixed(4);

  return `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik`;
}

export function MapContainer() {
  const [zoomLevel, setZoomLevel] = useState(4);
  const mapUrl = useMemo(() => buildMapUrl(zoomLevel), [zoomLevel]);

  return (
    <motion.section
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-[20px] bg-white shadow-xl shadow-slate-200/70"
    >
      <div className="relative h-[430px] overflow-hidden rounded-[20px] bg-slate-200">
        <iframe
          title="Rider trip map"
          src={mapUrl}
          className="absolute inset-0 h-full w-full border-0 grayscale-[0.05]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.08))]" />

        <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full">
          <path d="M18 18 C 36 22, 41 40, 54 46 S 72 60, 82 80" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeDasharray="4 5" strokeLinecap="round" />
        </svg>

        <div className="absolute left-[16%] top-[15%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg shadow-slate-300/70">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white bg-[#3B82F6] shadow-[0_0_0_4px_rgba(59,130,246,0.2)]" />
          Pickup
        </div>
        <div className="absolute left-[82%] top-[79%] flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-lg shadow-slate-300/70">
          <span className="h-3.5 w-3.5 rounded-full border-2 border-white bg-[#DC2626] shadow-[0_0_0_4px_rgba(220,38,38,0.18)]" />
          Sacramento
        </div>

        <div className="absolute right-5 top-5 grid gap-3">
          <button
            type="button"
            onClick={() => setZoomLevel((current) => Math.min(current + 1, 8))}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-lg shadow-slate-300/70 transition hover:text-[#3B82F6]"
            aria-label="Zoom in"
          >
            <HiPlus className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((current) => Math.max(current - 1, 2))}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-lg shadow-slate-300/70 transition hover:text-[#3B82F6]"
            aria-label="Zoom out"
          >
            <HiMinus className="h-5 w-5" />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-white/92 px-4 py-3 text-[11px] text-slate-500 backdrop-blur">
          <span>Map preview with OpenStreetMap tiles</span>
          <span>© OpenStreetMap contributors</span>
        </div>
      </div>
    </motion.section>
  );
}
