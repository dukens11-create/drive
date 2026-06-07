const steps = [
  { label: 'Searching for driver', icon: '⟳', active: true },
  { label: 'Driver assigned', icon: '✓' },
  { label: 'Driver arriving', icon: '🚗' },
  { label: 'Ride started', icon: '▶' },
  { label: 'Ride completed', icon: '🏁' },
];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function RideProgress() {
  return (
    <section className="rounded-[20px] border border-white/70 bg-white/78 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-950">Live ride status</p>
          <p className="mt-2 text-sm text-slate-500">We’re finding the best driver for you.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold text-[#2563eb]">
          <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
          Matching
        </div>
      </div>

      <div className="relative mt-6">
        <div className="absolute left-6 right-6 top-5 hidden h-1 rounded-full bg-slate-200 md:block" />
        <div className="absolute left-6 top-5 hidden h-1 w-[8%] rounded-full bg-[#3B82F6] shadow-[0_0_20px_rgba(59,130,246,0.55)] md:block" />
        <div className="grid gap-4 md:grid-cols-5">
          {steps.map((step) => (
            <div key={step.label} className="relative flex items-center gap-4 md:flex-col md:items-start">
              <div
                className={cn(
                  'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition',
                  step.active
                    ? 'border-[#3B82F6] bg-[#3B82F6] text-white shadow-[0_0_0_8px_rgba(59,130,246,0.12),0_0_24px_rgba(59,130,246,0.45)]'
                    : 'border-slate-200 bg-white text-slate-400',
                )}
              >
                {step.active ? <span className="animate-pulse">{step.icon}</span> : step.icon}
              </div>
              <div>
                <p className={cn('text-sm font-medium', step.active ? 'text-slate-950' : 'text-slate-400')}>{step.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
