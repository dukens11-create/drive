export function UserProfileCard() {
  return (
    <aside className="rounded-[20px] border border-white/70 bg-white/82 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#dbeafe,#cbd5e1)] text-lg font-semibold text-slate-700">
          RD
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#3B82F6]">Role</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">RIDER</p>
        </div>
      </div>
      <dl className="mt-6 space-y-4 text-sm">
        <div>
          <dt className="text-slate-400">Email</dt>
          <dd className="mt-1 font-medium text-slate-900">rider@example.com</dd>
        </div>
        <div>
          <dt className="text-slate-400">Rider ID</dt>
          <dd className="mt-1 font-medium text-slate-900">rider_7f28a1d0c4bf</dd>
        </div>
      </dl>
    </aside>
  );
}
