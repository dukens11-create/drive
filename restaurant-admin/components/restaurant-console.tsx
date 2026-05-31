'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import type { RootState } from '@/lib/store';
import { useAuth } from '@/components/providers';

export const sectionOrder = ['dashboard', 'orders', 'menu', 'analytics', 'profile', 'earnings', 'staff', 'reviews', 'promotions', 'support', 'delivery', 'settings'] as const;

type SectionKey = (typeof sectionOrder)[number];

const sectionMeta: Record<SectionKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Live KPIs, recent orders, quick actions, and revenue snapshots.' },
  orders: { title: 'Order management', subtitle: 'Incoming alerts, active preparation flow, KDS, and order history exports.' },
  menu: { title: 'Menu management', subtitle: 'Categories, items, variants, availability windows, and CSV import/export.' },
  analytics: { title: 'Analytics & reporting', subtitle: 'Revenue, order, customer, menu, and ratings analytics with scheduled reports.' },
  profile: { title: 'Profile & settings', subtitle: 'Restaurant profile, operating hours, document management, and notification preferences.' },
  earnings: { title: 'Earnings & payouts', subtitle: 'Earnings trend, payout requests, commission breakdown, and tax reports.' },
  staff: { title: 'Staff management', subtitle: 'Staff list, roles, invitations, permissions, and activity logs.' },
  reviews: { title: 'Reviews & ratings', subtitle: 'Review inbox, response tools, helpful/resolved actions, and rating metrics.' },
  promotions: { title: 'Promotions & offers', subtitle: 'Create offers, manage promo codes, and measure campaign performance.' },
  support: { title: 'Support & help', subtitle: 'Support tickets, FAQ, knowledge base, and contact support workflow.' },
  delivery: { title: 'Delivery & integration', subtitle: 'Zones, fees, ETA settings, and assigned delivery tracking.' },
  settings: { title: 'Account & security', subtitle: 'Password/email settings, 2FA, privacy/GDPR controls, terms, and app versioning.' }
};

const mockMetrics = {
  ordersToday: 76,
  ordersWeek: 402,
  ordersMonth: 1548,
  revenueToday: 3824,
  revenueWeek: 21201,
  revenueMonth: 83590,
  averageOrderValue: 26.3,
  averageRating: 4.7
};

async function fetchDashboardAnalytics() {
  await new Promise(resolve => setTimeout(resolve, 100));
  return {
    revenueTrend: [2200, 2500, 3100, 3400, 2900, 3600, 3824],
    ordersByHour: [8, 12, 10, 14, 20, 18, 11, 7],
    popularItems: [
      { label: 'Classic Burger', value: 189 },
      { label: 'Chicken Wrap', value: 133 },
      { label: 'Caesar Salad', value: 95 }
    ]
  };
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function BarList({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map(row => row.value), 1);
  return (
    <div className="space-y-3">
      {rows.map(row => (
        <div key={row.label}>
          <div className="flex justify-between text-sm text-[var(--muted)]"><span>{row.label}</span><span>{row.value}</span></div>
          <div className="mt-1 h-2 rounded-full bg-[var(--surface)]"><div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${(row.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function RestaurantConsole({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, session } = useAuth();
  const { theme, setTheme } = useTheme();
  const alerts = useSelector((state: RootState) => state.realtime.alerts);
  const liveOrderCount = useSelector((state: RootState) => state.realtime.liveOrderCount);
  const socketConnected = useSelector((state: RootState) => state.realtime.socketConnected);
  const currentSection = (pathname.replace('/dashboard', '').replace(/^\//, '') || 'dashboard') as SectionKey;

  return (
    <div className="grid min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:grid-cols-[270px_1fr]">
      <aside className="border-r border-[var(--border)] bg-[var(--card)] p-4">
        <div className="rounded-3xl bg-[linear-gradient(135deg,#7c2d12,#f97316)] p-5 text-white">
          <p className="text-xs uppercase tracking-[0.24em] text-orange-100">Restaurant admin</p>
          <p className="mt-2 text-xl font-bold">{session?.user.email}</p>
          <p className="mt-1 text-sm text-orange-100">Live orders: {liveOrderCount}</p>
        </div>
        <nav className="mt-4 grid gap-1">
          {sectionOrder.map(section => (
            <Link key={section} href={section === 'dashboard' ? '/dashboard' : `/dashboard/${section}`} className={`rounded-xl px-3 py-2 text-sm ${currentSection === section ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'text-[var(--muted)] hover:bg-[var(--surface)]'}`}>
              {sectionMeta[section].title}
            </Link>
          ))}
        </nav>
        <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">Realtime status</p>
          <p className="mt-2">Socket: {socketConnected ? 'connected' : 'offline fallback'}</p>
          <p className="mt-1">Alerts: {alerts.length}</p>
        </div>
        <div className="mt-4 flex gap-2">
          <button className="flex-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} type="button">{theme === 'dark' ? <Sun className="mx-auto h-4 w-4" /> : <Moon className="mx-auto h-4 w-4" />}</button>
          <button className="flex-1 rounded-xl border border-[var(--border)] px-3 py-2 text-sm" onClick={logout} type="button">Logout</button>
        </div>
      </aside>
      <main className="min-w-0 space-y-6 p-4 md:p-6">{children}</main>
    </div>
  );
}

export function RestaurantSectionPage({ section }: { section: SectionKey }) {
  const alerts = useSelector((state: RootState) => state.realtime.alerts);
  const liveOrderCount = useSelector((state: RootState) => state.realtime.liveOrderCount);
  const analytics = useQuery({ queryKey: ['restaurant-dashboard-analytics'], queryFn: fetchDashboardAnalytics });
  const meta = sectionMeta[section];

  const revenueRows = useMemo(() => (analytics.data?.revenueTrend || []).map((value, index) => ({ label: `Day ${index + 1}`, value })), [analytics.data?.revenueTrend]);
  const hourRows = useMemo(() => (analytics.data?.ordersByHour || []).map((value, index) => ({ label: `${9 + index}:00`, value })), [analytics.data?.ordersByHour]);

  return (
    <>
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">Restaurant operations</p>
        <h1 className="mt-2 text-3xl font-bold">{meta.title}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{meta.subtitle}</p>
      </header>

      {section === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Orders (today/week/month)" value={`${mockMetrics.ordersToday} / ${mockMetrics.ordersWeek} / ${mockMetrics.ordersMonth}`} />
            <Metric label="Revenue (today/week/month)" value={`$${mockMetrics.revenueToday} / $${mockMetrics.revenueWeek} / $${mockMetrics.revenueMonth}`} />
            <Metric label="Average order value" value={`$${mockMetrics.averageOrderValue}`} />
            <Metric label="Average rating" value={`${mockMetrics.averageRating} ★`} />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <Card title="Real-time orders" description="Incoming count, recent alerts, and quick order actions.">
              <p className="text-sm">Pending orders: <strong>{liveOrderCount}</strong></p>
              <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
                {(alerts.length ? alerts : [{ id: 'default', title: 'No alerts yet', message: 'Socket events will stream here.', createdAt: new Date().toISOString() }]).slice(0, 5).map(alert => (
                  <div key={alert.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"><strong>{alert.title}:</strong> {alert.message}</div>
                ))}
              </div>
            </Card>
            <Card title="Charts" description="Revenue trend, orders by hour, and popular items.">
              {analytics.isLoading ? <p className="text-sm text-[var(--muted)]">Loading chart data…</p> : (
                <div className="space-y-4">
                  <BarList rows={revenueRows} />
                  <BarList rows={hourRows} />
                  <BarList rows={analytics.data?.popularItems || []} />
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {section === 'orders' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Incoming + active orders" description="Accept/reject alerts, status progression, ETA updates, and KDS flow.">
            <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>Real-time new order notifications with visual + sound alert placeholders.</li>
              <li>Accept/reject, confirm, start, pause, ready, and add notes/ETA updates.</li>
              <li>KDS cards with color-coded priority and printable ticket action.</li>
              <li>Order detail includes customer contact, address, payment, and timeline.</li>
            </ul>
          </Card>
          <Card title="Order history" description="Search/filter completed orders and export CSV/PDF.">
            <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
              <li>Date-range and status filtering</li>
              <li>Search by order ID or customer</li>
              <li>CSV/PDF export support</li>
            </ul>
          </Card>
        </div>
      )}

      {section === 'menu' && (
        <Card title="Menu management suite" description="Categories, items, variants, availability, and bulk operations.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 text-sm text-[var(--muted)]">
            {['Category CRUD + drag/drop reorder', 'Item CRUD with image, ingredients, allergens', 'Variants and add-ons with price modifiers', 'Time-based availability + global on/off', 'Bulk enable/disable and CSV import/export', 'Template download for bulk menu import'].map(item => (
              <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">{item}</div>
            ))}
          </div>
        </Card>
      )}

      {section === 'analytics' && (
        <Card title="Analytics & reporting" description="Revenue, orders, customers, menu performance, ratings, and scheduled exports.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 text-sm text-[var(--muted)]">
            {['Daily/monthly revenue trends + comparisons', 'Orders by hour, fulfillment rate, AOV', 'Customer growth and repeat customer %', 'Top/least selling items and item revenue', 'Rating distribution and recent feedback', 'Daily/weekly/monthly/custom report scheduler'].map(item => (
              <div key={item} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2">{item}</div>
            ))}
          </div>
        </Card>
      )}

      {section === 'profile' && <Card title="Restaurant profile" description="Profile, operating hours, documents, bank setup, and notifications."><p className="text-sm text-[var(--muted)]">Manage restaurant identity, cuisine, delivery settings, tax config, licenses/permits, payout bank details, and notification channels.</p></Card>}
      {section === 'earnings' && <Card title="Earnings & payouts" description="Track commissions, platform fees, trends, and payout requests."><p className="text-sm text-[var(--muted)]">View today/week/month earnings, payout history, payout status filters, and generate financial/tax reports.</p></Card>}
      {section === 'staff' && <Card title="Staff management" description="Role-based staff onboarding and activity logs."><p className="text-sm text-[var(--muted)]">Invite staff, assign permissions, update roles, activate/deactivate members, and review login/action history.</p></Card>}
      {section === 'reviews' && <Card title="Reviews & ratings" description="Moderate reviews and publish responses."><p className="text-sm text-[var(--muted)]">Filter by stars, sort by date, track response status, reply/edit responses, and monitor average rating breakdown.</p></Card>}
      {section === 'promotions' && <Card title="Promotions & offers" description="Create targeted offers and monitor conversion."><p className="text-sm text-[var(--muted)]">Support fixed/percentage/free-item promotions with date windows, promo codes, activation toggles, and performance metrics.</p></Card>}
      {section === 'support' && <Card title="Support center" description="Ticket queue, chat, FAQ, and documentation."><p className="text-sm text-[var(--muted)]">Handle support requests, chat with support agents, and access help docs with contact form fallback.</p></Card>}
      {section === 'delivery' && <Card title="Delivery & integrations" description="Delivery zones, ETAs, fees, and driver assignment visibility."><p className="text-sm text-[var(--muted)]">Configure zones, delivery pricing, estimated windows, and monitor active delivery assignments.</p></Card>}
      {section === 'settings' && <Card title="Account, privacy, and security" description="Password/email changes, 2FA, GDPR controls, legal pages, and version info."><p className="text-sm text-[var(--muted)]">Configure account security settings, privacy options, and legal/about documentation links.</p></Card>}
    </>
  );
}
