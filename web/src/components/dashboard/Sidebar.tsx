'use client';

import { motion } from 'framer-motion';
import { HiOutlineArrowLeftOnRectangle, HiOutlineBuildingOffice2, HiOutlineMapPin, HiOutlineTruck, HiOutlineUser } from 'react-icons/hi2';

type SidebarProps = {
  activeItem?: 'Rider' | 'Driver' | 'Admin' | 'Logout';
};

const navItems = [
  { label: 'Rider', icon: HiOutlineUser },
  { label: 'Driver', icon: HiOutlineTruck },
  { label: 'Admin', icon: HiOutlineBuildingOffice2 },
  { label: 'Logout', icon: HiOutlineArrowLeftOnRectangle },
] as const;

export function Sidebar({ activeItem = 'Rider' }: SidebarProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="w-full rounded-[28px] bg-gradient-to-b from-[#071226] to-[#0b1730] p-5 text-white shadow-2xl shadow-[#071226]/35 xl:min-h-[880px] xl:w-[240px] xl:rounded-[32px]"
    >
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-[#FFC107] shadow-lg shadow-[#FFC107]/20">
          <HiOutlineMapPin className="h-6 w-6" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">Drive</p>
          <h1 className="text-xl font-bold tracking-tight">Drive Rider</h1>
        </div>
      </div>

      <nav className="mt-10 grid gap-3" aria-label="Rider navigation">
        {navItems.map(({ label, icon: Icon }, index) => {
          const isActive = label === activeItem;

          return (
            <motion.button
              key={label}
              type="button"
              whileHover={{ scale: 1.01, x: isActive ? 0 : 4 }}
              whileTap={{ scale: 0.99 }}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 * index, duration: 0.3 }}
              className={[
                'flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-[#1E40AF] text-white shadow-[0_0_0_1px_rgba(96,165,250,0.55),0_14px_30px_rgba(30,64,175,0.45)]'
                  : 'text-slate-300 hover:bg-white/6 hover:text-white',
              ].join(' ')}
            >
              <Icon className={isActive ? 'h-5 w-5 text-sky-200' : 'h-5 w-5 text-slate-400'} />
              <span>{label}</span>
            </motion.button>
          );
        })}
      </nav>
    </motion.aside>
  );
}
