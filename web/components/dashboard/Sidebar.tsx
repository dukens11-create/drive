const navItems = [
  { label: 'Rider', icon: '🧍', active: true, href: '/' },
  { label: 'Driver', icon: '🚗', href: '/ride/live' },
  { label: 'Admin', icon: '🛡️', href: '/account' },
  { label: 'Logout', icon: '↪', href: '/auth' },
];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function Sidebar() {
  return (
    <aside className="hidden w-full max-w-[240px] shrink-0 rounded-[28px] bg-[linear-gradient(180deg,#071226_0%,#0b1730_100%)] p-6 text-white shadow-[0_28px_90px_rgba(2,6,23,0.55)] lg:flex lg:min-h-[calc(100vh-48px)] lg:flex-col">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-xl">
          📍
        </div>
        <div>
          <p className="text-lg font-semibold">Drive Rider</p>
          <p className="mt-1 text-xs text-slate-400">Premium mobility</p>
        </div>
      </div>

      <nav className="mt-10 space-y-2">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition duration-300 hover:bg-white/8 hover:text-white',
              item.active && 'bg-[#0f3b8d] text-white shadow-[0_16px_40px_rgba(59,130,246,0.45)]',
            )}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="mt-auto rounded-[22px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
        <p className="text-sm font-semibold">Ride smarter</p>
        <p className="mt-2 text-sm leading-6 text-slate-400">Track your booking, monitor ETAs, and manage every trip from one polished rider cockpit.</p>
      </div>
    </aside>
  );
}
