export function FareEstimate() {
  return (
    <div className="rounded-[20px] border border-sky-100 bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(14,165,233,0.05))] p-5 shadow-[0_18px_40px_rgba(148,163,184,0.16)]">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">Fare estimate</p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">$9.89 • 3.2 mi • 11 min</p>
      <p className="mt-2 text-sm text-slate-500">Live estimate includes current road conditions and pickup demand.</p>
    </div>
  );
}
