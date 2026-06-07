'use client';

import { useState } from 'react';
import { FareEstimate } from './FareEstimate';
import { RideProgress } from './RideProgress';
import { RideTypeCard } from './RideTypeCard';
import { Sidebar } from './Sidebar';
import { UserProfileCard } from './UserProfileCard';

const rideTypes = [
  {
    id: 'economy',
    title: 'Economy',
    description: 'Affordable rides for the everyday trip.',
    eta: '3 min',
    icon: <span className="text-lg">🚘</span>,
  },
  {
    id: 'comfort',
    title: 'Comfort',
    description: 'Extra legroom and smoother premium interiors.',
    eta: '5 min',
    icon: <span className="text-lg">🚙</span>,
  },
  {
    id: 'premium',
    title: 'Premium',
    description: 'Top-rated drivers with executive-class vehicles.',
    eta: '7 min',
    icon: <span className="text-lg">🚖</span>,
  },
];

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M12 21s6-5.33 6-11a6 6 0 1 0-12 0c0 5.67 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function CarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 15.5V13l2.2-5.13A2 2 0 0 1 8.05 6.6h7.9a2 2 0 0 1 1.85 1.27L20 13v2.5" />
      <path d="M3 15.5h18v2a1.5 1.5 0 0 1-1.5 1.5H18v-1.25a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V19H9v-1.25a.75.75 0 0 0-.75-.75h-1.5a.75.75 0 0 0-.75.75V19H4.5A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="7.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MapPanel() {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_30%),linear-gradient(160deg,#08101f_0%,#0f172a_58%,#111827_100%)] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.28)] min-h-[520px]">
      <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.14) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
      <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.28),transparent_68%)]" />

      <div className="absolute right-5 top-5 z-20 flex flex-col gap-3 sm:flex-row">
        <button type="button" className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-950/40 backdrop-blur-xl transition hover:bg-slate-900/80">
          Live map
        </button>
        <button type="button" className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-950/40 backdrop-blur-xl transition hover:bg-slate-900/80">
          Satellite
        </button>
      </div>

      <div className="absolute right-5 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-3">
        {['+', '−'].map((label) => (
          <button key={label} type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/55 text-xl font-semibold text-white shadow-lg shadow-slate-950/40 backdrop-blur-xl transition hover:bg-slate-900/80">
            {label}
          </button>
        ))}
      </div>

      <div className="relative z-10 h-full min-h-[488px] rounded-[24px] border border-white/10 bg-white/4 backdrop-blur-sm">
        <svg viewBox="0 0 900 560" className="absolute inset-0 h-full w-full">
          <path d="M123 452C188 427 225 357 284 324C366 278 416 304 494 261C575 217 625 125 780 117" stroke="rgba(59,130,246,0.18)" strokeWidth="24" strokeLinecap="round" fill="none" />
          <path d="M123 452C188 427 225 357 284 324C366 278 416 304 494 261C575 217 625 125 780 117" stroke="#60a5fa" strokeWidth="8" strokeLinecap="round" fill="none" strokeDasharray="12 12" />
        </svg>

        <div className="absolute left-[14%] top-[74%]">
          <div className="absolute inset-0 rounded-full bg-emerald-400/35 blur-xl" />
          <span className="relative flex h-5 w-5 animate-pulse rounded-full border-4 border-white bg-emerald-400" />
        </div>
        <div className="absolute left-[48%] top-[48%]">
          <div className="absolute inset-0 rounded-full bg-sky-400/35 blur-xl" />
          <span className="relative flex h-5 w-5 animate-pulse rounded-full border-4 border-white bg-sky-400" />
        </div>
        <div className="absolute left-[82%] top-[18%]">
          <div className="absolute inset-0 rounded-full bg-rose-400/35 blur-xl" />
          <span className="relative flex h-5 w-5 animate-pulse rounded-full border-4 border-white bg-rose-500" />
        </div>

        <div className="absolute left-5 top-5 max-w-[260px] rounded-[22px] border border-white/10 bg-slate-950/55 p-4 text-white shadow-xl shadow-slate-950/35 backdrop-blur-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">Route overview</p>
          <p className="mt-3 text-xl font-semibold">Downtown pickup to Mission Bay</p>
          <p className="mt-2 text-sm text-slate-300">Animated pickup, driver, and destination markers show the full rider journey at a glance.</p>
        </div>

        <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[320px] rounded-[22px] border border-white/10 bg-slate-950/55 p-4 text-white shadow-xl shadow-slate-950/35 backdrop-blur-xl">
            <p className="text-sm font-semibold">Mapbox / OpenStreetMap</p>
            <p className="mt-2 text-sm text-slate-300">Live route preview with floating controls, animated markers, and premium glass surfaces.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Pickup', 'Market Street'],
              ['Driver', '2 min away'],
              ['Destination', 'Chase Center'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[20px] border border-white/10 bg-slate-950/55 px-4 py-3 text-white shadow-lg shadow-slate-950/35 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{label}</p>
                <p className="mt-2 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BookingCard({
  selectedRideType,
  onSelectRideType,
}: {
  selectedRideType: string;
  onSelectRideType: (rideType: string) => void;
}) {
  return (
    <section className="rounded-[24px] border border-white/75 bg-white/82 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Rider dashboard</p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-[2.75rem]">Book and track your ride</h1>
        <p className="max-w-xl text-sm leading-6 text-slate-500">Modern, premium trip management with fast pickup entry, live route visuals, polished pricing cards, and a crisp Uber-inspired booking flow.</p>
      </div>

      <div className="mt-8 grid gap-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-600">Pickup</span>
          <span className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/60">
            <CarIcon className="h-5 w-5 text-sky-500" />
            <span className="text-sm text-slate-500">1 Market Street, San Francisco</span>
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-600">Destination</span>
          <span className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/60">
            <PinIcon className="h-5 w-5 text-rose-500" />
            <span className="text-sm text-slate-500">Chase Center, Mission Bay</span>
          </span>
        </label>
      </div>

      <button type="button" className="mt-3 text-sm font-semibold text-[#2563eb] transition hover:text-[#1d4ed8]">
        Use current location
      </button>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-950">Choose ride type</p>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Best availability</p>
        </div>
        <div className="grid gap-3">
          {rideTypes.map((rideType) => (
            <RideTypeCard
              key={rideType.id}
              title={rideType.title}
              description={rideType.description}
              eta={rideType.eta}
              icon={rideType.icon}
              active={selectedRideType === rideType.id}
              onClick={() => onSelectRideType(rideType.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <FareEstimate />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#2563eb] px-5 py-4 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(37,99,235,0.3)] transition duration-300 hover:scale-[1.02] hover:bg-[#1d4ed8]">
          <CarIcon className="h-5 w-5" />
          Request ride
        </button>
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-rose-200 bg-white px-5 py-4 text-sm font-semibold text-rose-500 transition duration-300 hover:scale-[1.02] hover:border-rose-300 hover:bg-rose-50">
          Cancel ride
        </button>
      </div>
    </section>
  );
}

export function RiderDashboard() {
  const [selectedRideType, setSelectedRideType] = useState('economy');

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <Sidebar />

        <main className="min-w-0 flex-1 space-y-6">
          <div className="flex items-center justify-between rounded-[24px] bg-[linear-gradient(135deg,rgba(7,18,38,0.96),rgba(11,23,48,0.92))] px-5 py-4 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)] lg:hidden">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg">📍</span>
              <div>
                <p className="font-semibold">Drive Rider</p>
                <p className="text-xs text-slate-400">Premium mobility</p>
              </div>
            </div>
            <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-200">Rider</span>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
            <div className="rounded-[24px] border border-white/70 bg-white/78 p-6 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-600">Premium booking</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.2rem]">Rider dashboard</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">A clean two-column dispatch layout with polished booking surfaces, premium trip cards, and a live route panel designed to feel modern and investor-ready.</p>
            </div>
            <UserProfileCard />
          </div>

          <div className="grid gap-6 xl:grid-cols-[420px,minmax(0,1fr)]">
            <div className="space-y-6">
              <BookingCard selectedRideType={selectedRideType} onSelectRideType={setSelectedRideType} />
              <RideProgress />
            </div>
            <MapPanel />
          </div>
        </main>
      </div>
    </div>
  );
}
