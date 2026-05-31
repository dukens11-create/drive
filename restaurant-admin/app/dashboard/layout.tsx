'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RestaurantConsole } from '@/components/restaurant-console';
import { useAuth } from '@/components/providers';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, session } = useAuth();

  useEffect(() => {
    if (ready && !session && pathname !== '/login') {
      router.replace('/login');
    }
  }, [pathname, ready, router, session]);

  if (!ready || !session) {
    return <main className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Loading restaurant workspace…</main>;
  }

  return <RestaurantConsole>{children}</RestaurantConsole>;
}
