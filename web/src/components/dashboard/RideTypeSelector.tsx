'use client';

import type { RideTypeOption } from './types';
import { RideTypeCard } from './RideTypeCard';

export function RideTypeSelector({
  options,
  selectedRideType,
  onSelect,
}: {
  options: RideTypeOption[];
  selectedRideType: RideTypeOption['id'];
  onSelect: (id: RideTypeOption['id']) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">Select ride type</p>
        <p className="mt-1 text-xs text-slate-400">Pick the best ride for today&apos;s trip.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <RideTypeCard key={option.id} option={option} selected={option.id === selectedRideType} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
