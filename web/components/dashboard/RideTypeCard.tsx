type RideTypeCardProps = {
  title: string;
  description: string;
  eta: string;
  active?: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function RideTypeCard({ title, description, eta, active, icon, onClick }: RideTypeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group rounded-[20px] border p-4 text-left transition duration-300 hover:-translate-y-0.5 hover:shadow-lg',
        active
          ? 'border-[#3B82F6] bg-[#eff6ff] shadow-[0_18px_38px_rgba(59,130,246,0.18)]'
          : 'border-slate-200 bg-white/85 hover:border-slate-300 hover:shadow-slate-200/70',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-2xl transition',
            active ? 'bg-[#3B82F6] text-white shadow-[0_10px_26px_rgba(59,130,246,0.38)]' : 'bg-slate-100 text-slate-700',
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-950">{title}</p>
            <span className={cn('text-xs font-medium', active ? 'text-[#2563eb]' : 'text-slate-400')}>{eta}</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>
    </button>
  );
}
