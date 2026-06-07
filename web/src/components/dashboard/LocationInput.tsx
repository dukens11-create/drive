'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

export function LocationInput({
  label,
  icon,
  value,
  action,
  footer,
  onChange,
  placeholder,
  readOnly,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  action?: ReactNode;
  footer?: ReactNode;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#3B82F6] shadow-sm shadow-slate-200">
            {icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="text-xs text-slate-400">Set your {label.toLowerCase()} point</p>
          </div>
        </div>
        {action}
      </div>
      <motion.input
        whileFocus={{ scale: 1.01 }}
        type="text"
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none ring-0 placeholder:text-slate-400 focus:border-[#3B82F6] focus:shadow-[0_0_0_4px_rgba(59,130,246,0.12)]"
      />
      {footer}
    </div>
  );
}
