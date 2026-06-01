'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import { useAdmin, useAuth, useTheme, useLocale, SUPPORTED_LOCALES, LOCALE_LABELS } from '@/components/providers';
import type { DriverSummary, SectionKey } from '@/lib/api';

export const sectionOrder = [
  'dashboard',
  'analytics',
  'drivers',
  'rides',
  'payments',
  'users',
  'support',
  'safety',
  'promotions',
  'settings',
  'reports'
] as const;

const sectionMeta: Record<SectionKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Live platform KPIs, operations map, and notifications.' },
  analytics: { title: 'Analytics', subtitle: 'Revenue, growth, driver performance, and retention trends.' },
  drivers: { title: 'Driver management', subtitle: 'Verification, compliance, earnings, and bulk actions.' },
  rides: { title: 'Ride management', subtitle: 'Live ride tracking, trip details, disputes, and cancellations.' },
  payments: { title: 'Payments & wallet', subtitle: 'Transactions, refunds, wallet exposure, and revenue monitoring.' },
  users: { title: 'User management', subtitle: 'Driver and rider account actions, search, and history.' },
  support: { title: 'Support & tickets', subtitle: 'Ticket queues, assignment notes, and customer follow-up.' },
  safety: { title: 'Safety & compliance', subtitle: 'Incident monitoring, escalations, and compliance reporting.' },
  promotions: { title: 'Promotions & marketing', subtitle: 'Promo codes, market launches, and referral performance.' },
  settings: { title: 'Settings & configuration', subtitle: 'Maintenance mode, feature flags, rates, admin access, and API keys.' },
  reports: { title: 'Reporting', subtitle: 'Exportable operational summaries and custom report datasets.' }
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function csvDownload(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escapeCsvValue = (value: unknown) => {
    const raw = String(value ?? '');
    const escaped = raw.replace(/"/g, '""');
    return /[",\n]/.test(raw) ? `"${escaped}"` : escaped;
  };
  const csv = [headers.map(escapeCsvValue).join(','), ...rows.map(row => headers.map(header => escapeCsvValue(row[header])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.click();
  URL.revokeObjectURL(url);
}

function downloadContent(filename: string, content: string, contentType: string, isBase64 = false) {
  const payload = isBase64
    ? Uint8Array.from(atob(content), character => character.charCodeAt(0))
    : content;
  const blob = new Blob([payload], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  link.click();
  URL.revokeObjectURL(url);
}

function inferImportFormat(filename: string) {
  if (/\.csv$/i.test(filename)) return 'csv';
  if (/\.xlsx$/i.test(filename)) return 'xlsx';
  return 'json';
}

function readImportFile(file: File, format: string) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Unable to read file'));
    if (format === 'xlsx') {
      reader.onload = () => {
        const result = reader.result;
        if (!(result instanceof ArrayBuffer)) {
          reject(new Error('File read operation did not return binary data.'));
          return;
        }
        const bytes = new Uint8Array(result);
        const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
        resolve(btoa(binary));
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(file);
  });
}

function SectionCard({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value, tone = 'default', helper }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' | 'danger'; helper?: string }) {
  const toneMap = {
    default: 'bg-[var(--surface)] text-[var(--foreground)]',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
  };
  return (
    <div className={`rounded-[1.4rem] border border-[var(--border)] p-4 ${toneMap[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
      {helper ? <p className="mt-2 text-sm opacity-75">{helper}</p> : null}
    </div>
  );
}

function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const toneMap = {
    default: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
  };
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneMap[tone]}`}>{children}</span>;
}

function BarChart({ data, formatter = formatCompactNumber }: { data: Array<{ label: string; value: number }>; formatter?: (value: number) => string }) {
  const max = Math.max(...data.map(item => item.value), 1);
  return (
    <div className="space-y-3">
      {data.map(item => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
            <span>{item.label}</span>
            <span>{formatter(item.value)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--surface)]">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function OperationsMap({ drivers, rides }: { drivers: DriverSummary[]; rides: Array<Record<string, unknown>> }) {
  const points = [
    ...drivers.filter(driver => typeof driver.lat === 'number' && typeof driver.lng === 'number').map(driver => ({
      id: driver.userId,
      type: 'driver' as const,
      lat: driver.lat as number,
      lng: driver.lng as number,
      label: driver.user?.email || driver.userId
    })),
    ...rides
      .filter(ride => typeof ride.pickupLat === 'number' && typeof ride.pickupLng === 'number')
      .slice(0, 12)
      .map(ride => ({
        id: String(ride.id),
        type: 'ride' as const,
        lat: Number(ride.pickupLat),
        lng: Number(ride.pickupLng),
        label: `Ride ${String(ride.id).slice(-6)}`
      }))
  ];
  const lats = points.map(point => point.lat);
  const lngs = points.map(point => point.lng);
  const minLat = Math.min(...lats, -1);
  const maxLat = Math.max(...lats, 1);
  const minLng = Math.min(...lngs, -1);
  const maxLng = Math.max(...lngs, 1);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
      <div className="relative min-h-[320px] overflow-hidden rounded-[1.4rem] border border-[var(--border)] bg-[linear-gradient(180deg,#dbeafe,#eff6ff)] dark:bg-[linear-gradient(180deg,#082f49,#0f172a)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_6%,rgba(255,255,255,0.55)_7%,transparent_8%)] [background-size:90px_90px] opacity-40" />
        {points.length ? (
          points.map(point => {
            const left = ((point.lng - minLng) / Math.max(maxLng - minLng, 0.0001)) * 100;
            const top = 100 - ((point.lat - minLat) / Math.max(maxLat - minLat, 0.0001)) * 100;
            return (
              <div key={point.id} className="absolute" style={{ left: `${left}%`, top: `${top}%` }}>
                <div className={`h-4 w-4 rounded-full border-2 border-white shadow-lg ${point.type === 'driver' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="mt-2 block -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/85 px-2 py-1 text-[10px] text-white">{point.label}</span>
              </div>
            );
          })
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">No live coordinates available yet.</div>
        )}
      </div>
      <div className="space-y-3">
        <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)]">Legend</p>
          <div className="mt-3 flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Drivers</div>
          <div className="mt-2 flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500" /> Pickups</div>
        </div>
        <div className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm font-semibold">Live queue</p>
          <div className="mt-3 space-y-3 text-sm text-[var(--muted)]">
            {rides.slice(0, 5).map(ride => (
              <div key={String(ride.id)} className="rounded-2xl border border-[var(--border)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-[var(--foreground)]">{String(ride.id).slice(-8)}</span>
                  <Badge tone={String(ride.status) === 'started' ? 'success' : 'warning'}>{String(ride.status)}</Badge>
                </div>
                <p className="mt-2">Fare {formatCurrency(Number(ride.fareEstimate || 0) * 100)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminConsole({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, session } = useAuth();
  const { notifications, loading, refresh } = useAdmin();
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const currentSection = (pathname.replace('/dashboard', '').replace(/^\//, '') || 'dashboard') as SectionKey;

  return (
    <div className="grid min-h-screen bg-[var(--background)] text-[var(--foreground)] lg:grid-cols-[280px_1fr]">
      <aside className="border-b border-[var(--border)] bg-[var(--card)] p-5 lg:border-b-0 lg:border-r">
        <div className="rounded-[1.5rem] bg-[linear-gradient(135deg,#0f172a,#2563eb)] p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-200">Drive admin</p>
          <h1 className="mt-3 text-2xl font-semibold">Operations hub</h1>
          <p className="mt-2 text-sm text-slate-200">Signed in as {session?.user.email || session?.user.id}</p>
        </div>
        <nav className="mt-5 grid gap-2">
          {sectionOrder.map(section => (
            <Link
              key={section}
              className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${currentSection === section ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]'}`}
              href={section === 'dashboard' ? '/dashboard' : `/dashboard/${section}`}
            >
              {sectionMeta[section].title}
            </Link>
          ))}
        </nav>
        <div className="mt-5 rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Live feed</p>
            <Badge tone={notifications.length ? 'warning' : 'default'}>{notifications.length}</Badge>
          </div>
          <div className="mt-3 space-y-3 text-xs text-[var(--muted)]">
            {notifications.length ? notifications.slice(0, 4).map(item => (
              <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="font-semibold text-[var(--foreground)]">{item.title}</p>
                <p className="mt-1">{item.message}</p>
              </div>
            )) : <p>No live alerts yet. Socket updates will appear here.</p>}
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button className="flex-1 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm" onClick={toggleTheme} type="button">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</button>
          <button className="flex-1 rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)]" onClick={() => { void refresh(); }} type="button">{loading ? t('loading') : t('refresh')}</button>
        </div>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as typeof locale)}
          aria-label={t('language')}
          className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)]"
        >
          {SUPPORTED_LOCALES.map((code) => (
            <option key={code} value={code}>{LOCALE_LABELS[code]}</option>
          ))}
        </select>
        <button className="mt-3 w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-sm text-[var(--muted)]" onClick={logout} type="button">{t('signOut')}</button>
      </aside>
      <main className="min-w-0 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}

export function AdminSectionPage({ section }: { section: SectionKey }) {
  const { overview, error, loading, approveDriver, suspendUser, updateIncident, updateSettings, upsertPromo, upsertMarket, updateTicket, replyTicket, createApiKey, revokeApiKey, exportData, importData, bulkOperation, lastApiKey } = useAdmin();
  const [resolution, setResolution] = useState('Resolved in admin dashboard');
  const [replyMessage, setReplyMessage] = useState('We are reviewing your case and will follow up shortly.');
  const [promoForm, setPromoForm] = useState({ code: 'WELCOME10', discountType: 'percent', discountValue: '10', active: true });
  const [marketForm, setMarketForm] = useState({ name: 'Downtown', city: 'San Francisco', country: 'USA', status: 'active' });
  const [settingsForm, setSettingsForm] = useState({ maintenanceMode: false, commissionRatePercent: '20', surgeMultiplier: '1.5', appVersion: '1.0.0' });
  const [apiKeyName, setApiKeyName] = useState('reporting-service');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [exportForm, setExportForm] = useState({ dataType: 'users', format: 'csv', columns: 'id,email,role', search: '', dateFrom: '', dateTo: '' });
  const [importForm, setImportForm] = useState({ dataType: 'users', format: 'json', content: '' });
  const [importFileName, setImportFileName] = useState('');

  const drivers = overview?.drivers || [];
  const rides = useMemo(() => (overview?.rides || []) as Array<Record<string, unknown>>, [overview]);
  const tickets = overview?.tickets || [];
  const incidents = overview?.incidents || [];
  const payments = overview?.payments || [];
  const refunds = overview?.refunds || [];
  const users = useMemo(() => {
    const source = overview?.users || [];
    return source.filter(user => {
      const matchesSearch = !userSearch.trim() || [user.email, user.phone, user.id].some(value => String(value || '').toLowerCase().includes(userSearch.trim().toLowerCase()));
      const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [overview?.users, userRoleFilter, userSearch]);
  const flaggedDrivers = drivers.filter(driver => driver.status === 'pending' || driver.incidentsCount > 0 || driver.cancellationRate > 0.15);
  const selectedTicket = tickets[0];
  const selectedIncident = incidents[0];
  const exportJobs = overview?.exportJobs || [];
  const importJobs = overview?.importJobs || [];
  const bulkJobs = overview?.bulkJobs || [];
  const verificationQueue = drivers.filter(driver => driver.verificationState === 'review_pending');

  function submitDriverReview(driver: DriverSummary, approved: boolean) {
    const notes = approved
      ? 'Approved after reviewing uploaded driver documents, OCR output, and selfie verification.'
      : 'Rejected after document review. Request resubmission of the verification package.';
    void approveDriver(driver.userId, approved, notes);
  }

  if (!overview && loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--muted)]">Loading dashboard data…</div>;
  }

  if (!overview) {
    return <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-6 text-red-700">{error || 'Unable to load the admin dashboard.'}</div>;
  }

  const meta = sectionMeta[section];
  const complianceReports = [
    { label: 'Tax exposure', value: formatCurrency(overview.analytics.finance.capturedRevenueCents), helper: `${overview.orders.length} delivery orders + ${overview.stats.totalRides} rides` },
    { label: 'Audit trail', value: String(overview.auditLogs.length), helper: 'Recent admin and security events' },
    { label: 'Open compliance items', value: String(overview.incidents.filter(incident => incident.status !== 'resolved').length), helper: `${overview.restaurants.filter(restaurant => String(restaurant.complianceStatus) !== 'approved').length} restaurants need review` },
    { label: 'Review volume', value: String(overview.reviews.length), helper: `${overview.restaurants.length} restaurants tracked` }
  ];

  async function handleAdvancedExport(payload?: Partial<typeof exportForm>) {
    const next = { ...exportForm, ...payload };
    const response = await exportData({
      dataType: next.dataType,
      format: next.format,
      columns: next.columns.split(',').map(column => column.trim()).filter(Boolean),
      filters: next.search.trim() ? { search: next.search.trim() } : {},
      dateFrom: next.dateFrom || undefined,
      dateTo: next.dateTo || undefined
    });
    downloadContent(response.filename, response.content, response.contentType, next.format === 'xlsx');
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextFormat = inferImportFormat(file.name);
    const content = await readImportFile(file, nextFormat);
    setImportForm(current => ({ ...current, format: nextFormat, content }));
    setImportFileName(file.name);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Drive platform</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{meta.title}</h2>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">{meta.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm" onClick={() => window.print()} type="button">Print / PDF</button>
          <button className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)]" onClick={() => csvDownload(`${section}-export.csv`, buildExportRows(section, overview))} type="button">Export CSV</button>
        </div>
      </header>

      {error ? <div className="rounded-[1.4rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {(section === 'dashboard' || section === 'analytics') && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active drivers" value={String(overview.realtime.activeDrivers)} helper={`${overview.stats.pendingDrivers} pending verification`} />
          <StatCard label="Pending rides" value={String(overview.realtime.activeRides)} tone="warning" helper={`${overview.stats.completedRides} completed`} />
          <StatCard label="Revenue" value={formatCurrency(overview.stats.totalRevenueCents)} tone="success" helper={`${overview.stats.totalPayments} payments processed`} />
          <StatCard label="Support tickets" value={String(overview.stats.openTickets)} tone={overview.stats.openTickets ? 'danger' : 'default'} helper={`${overview.analytics.support.avgResolutionHours}h avg resolution`} />
        </div>
      )}

      {section === 'dashboard' ? (
        <>
          <SectionCard title="Real-time map" description="Live active rides and driver coordinates streamed from the backend socket server.">
            <OperationsMap drivers={drivers} rides={rides.filter(ride => ['requested', 'accepted', 'started'].includes(String(ride.status)))} />
          </SectionCard>
          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <SectionCard title="Operational watchlist" description="Drivers needing verification, compliance review, or performance coaching.">
              <div className="space-y-3">
                {flaggedDrivers.slice(0, 6).map(driver => (
                  <div key={driver.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-4">
                    <div>
                      <p className="font-semibold">{driver.user?.email || driver.userId}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{driver.tripCount} trips • {driver.incidentsCount} incidents • rating {driver.rating.toFixed(1)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm" onClick={() => { submitDriverReview(driver, true); }} type="button">Approve</button>
                      <button className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => { void suspendUser(driver.userId, true); }} type="button">Suspend</button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Notifications" description="Real-time alerts for safety, dispatch, and support operations.">
              <div className="space-y-3 text-sm text-[var(--muted)]">
                {[
                  `${overview.realtime.highPriorityIncidents} high-priority safety incidents need review`,
                  `${overview.analytics.finance.pendingSettlementCents ? formatCurrency(overview.analytics.finance.pendingSettlementCents) : '$0.00'} pending settlement value`,
                  `${overview.analytics.support.pending} tickets currently in review`,
                  `${overview.stats.pendingDrivers} driver applications pending approval`
                ].map(item => (
                  <div key={item} className="rounded-2xl border border-[var(--border)] p-4">{item}</div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}

      {section === 'analytics' ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Revenue trends" description="Daily, weekly, and monthly revenue snapshots.">
            <div className="grid gap-6 lg:grid-cols-3">
              <BarChart data={overview.analytics.revenueByDay} formatter={value => formatCurrency(value)} />
              <BarChart data={overview.analytics.revenueByWeek} formatter={value => formatCurrency(value)} />
              <BarChart data={overview.analytics.revenueByMonth} formatter={value => formatCurrency(value)} />
            </div>
          </SectionCard>
          <SectionCard title="Growth & retention" description="User acquisition and rider spend behaviour.">
            <div className="grid gap-6 lg:grid-cols-2">
              <BarChart data={overview.analytics.userGrowthByDay} />
              <div className="space-y-3">
                {overview.analytics.riderLeaderboard.map(rider => (
                  <div key={rider.riderId} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{rider.name}</p>
                      <Badge tone="success">{rider.retentionScore}% retained</Badge>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">{rider.tripCount} trips • {formatCurrency(rider.spendingCents)}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
          <SectionCard title="Driver leaderboard" description="Top drivers by earnings, rating, and trip volume.">
            <div className="space-y-3">
              {overview.analytics.driverLeaderboard.map(driver => (
                <div key={driver.driverId} className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{driver.name}</p>
                    <Badge tone="success">{driver.rating.toFixed(1)} ★</Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{driver.tripCount} trips • {formatCurrency(driver.earningsCents)} earned</p>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Support & safety metrics" description="Average resolution time, satisfaction score, and safety closure rates.">
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard label="Resolved tickets" value={String(overview.analytics.support.resolved)} tone="success" helper={`${overview.analytics.support.avgResolutionHours}h average`} />
              <StatCard label="Satisfaction" value={`${overview.analytics.support.satisfactionScore}%`} helper="Derived from closed ticket throughput" />
              <StatCard label="Open incidents" value={String(overview.analytics.safety.open)} tone="danger" helper={`${overview.analytics.safety.underReview} under review`} />
              <StatCard label="Resolved incidents" value={String(overview.analytics.safety.resolved)} tone="success" helper={`${overview.analytics.safety.dismissed} dismissed`} />
            </div>
          </SectionCard>
        </div>
      ) : null}

      {section === 'drivers' ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Driver roster" description="Search, filter, verification, compliance, and earnings controls.">
            <div className="space-y-3">
              {drivers.map(driver => (
                <div key={driver.userId} className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{driver.user?.email || driver.userId}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone={driver.status === 'approved' ? 'success' : driver.status === 'pending' ? 'warning' : 'danger'}>{driver.status}</Badge>
                        <Badge>{driver.verificationState}</Badge>
                        <Badge>{driver.availabilityStatus}</Badge>
                        <Badge tone={driver.selfieVerification?.status === 'matched' ? 'success' : driver.selfieVerification?.status === 'failed' ? 'danger' : 'warning'}>
                          selfie {driver.selfieVerification?.status || 'missing'}
                        </Badge>
                      </div>
                      <p className="mt-3 text-sm text-[var(--muted)]">{driver.documents.length} documents • {driver.tripCount} trips • {formatCurrency(driver.earningsCents)} earnings • {driver.incidentsCount} safety flags</p>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        {(driver.verificationDocuments || []).slice(0, 4).map(document => (
                          <div key={document.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium">{document.type}</p>
                              <Badge tone={document.verificationStatus === 'approved' || document.verificationStatus === 'auto_verified' ? 'success' : document.verificationStatus === 'rejected' ? 'danger' : 'warning'}>
                                {document.verificationStatus}
                              </Badge>
                            </div>
                            <p className="mt-2 text-[var(--muted)]">{document.fileName}</p>
                            <p className="mt-1 text-[var(--muted)]">Expiry {document.expiryDate || 'Not required'}</p>
                            {document.extractedFields?.licenseNumber ? (
                              <p className="mt-1 text-[var(--muted)]">OCR license #{document.extractedFields.licenseNumber}</p>
                            ) : null}
                            {document.ocrText ? (
                              <pre className="mt-2 overflow-x-auto rounded-xl bg-[var(--card)] p-3 text-xs text-[var(--muted)] whitespace-pre-wrap">{document.ocrText}</pre>
                            ) : null}
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">
                        <p className="font-medium text-[var(--foreground)]">Review summary</p>
                        <p
                          className="mt-2"
                          aria-label={driver.selfieVerification ? `Selfie verification confidence score ${Math.round((driver.selfieVerification.score || 0) * 100)} percent` : 'Selfie verification confidence score not available'}
                        >
                          Selfie match score: {driver.selfieVerification ? `${Math.round((driver.selfieVerification.score || 0) * 100)}%` : 'Not available'}
                        </p>
                        <p className="mt-1">Admin review: {driver.verificationReview?.status || 'pending_review'}</p>
                        {driver.verificationReview?.notes ? <p className="mt-1">{driver.verificationReview.notes}</p> : null}
                        {driver.verificationReview?.checklist?.length ? (
                          <ul className="mt-2 list-disc space-y-1 pl-5">
                            {driver.verificationReview.checklist.map(item => <li key={item}>{item}</li>)}
                          </ul>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm" onClick={() => { submitDriverReview(driver, true); }} type="button">Approve</button>
                      <button className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm" onClick={() => { submitDriverReview(driver, false); }} type="button">Reject</button>
                      <button className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => { void suspendUser(driver.userId, true); }} type="button">Deactivate</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Verification review queue" description="Review license OCR, selfie verification, and approval workflow before activation.">
           <div className="space-y-3 text-sm">
             {verificationQueue.slice(0, 5).map(driver => (
               <div key={driver.userId} className="rounded-2xl border border-[var(--border)] p-4">
                 <div className="flex items-start justify-between gap-3">
                   <div>
                     <p className="font-semibold">{driver.user?.email || driver.userId}</p>
                     <p className="mt-1 text-[var(--muted)]">{driver.verificationDocuments?.length || 0} upload(s) • selfie {driver.selfieVerification?.status || 'missing'} • review {driver.verificationReview?.status || 'pending_review'}</p>
                   </div>
                   <Badge tone={driver.verificationState === 'review_pending' ? 'warning' : 'default'}>{driver.verificationState}</Badge>
                 </div>
                 {(driver.verificationDocuments || []).slice(0, 2).map(document => (
                   <div key={document.id} className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
                     <p className="font-medium">{document.type}</p>
                     <p className="mt-1 text-[var(--muted)]">{document.fileName}</p>
                     {document.ocrText ? <p className="mt-2 text-xs text-[var(--muted)]">{document.ocrText.split('\n').slice(0, 2).join(' • ')}</p> : null}
                   </div>
                 ))}
                 <div className="mt-3 flex gap-2">
                   <button className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm" onClick={() => { submitDriverReview(driver, true); }} type="button">Approve docs</button>
                   <button className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm" onClick={() => { submitDriverReview(driver, false); }} type="button">Reject docs</button>
                 </div>
               </div>
             ))}
             <button className="w-full rounded-2xl border border-[var(--border)] px-4 py-3" onClick={() => { void bulkOperation({ targetType: 'drivers', action: 'suspend', ids: flaggedDrivers.slice(0, 3).map(driver => driver.userId) }); }} type="button">Suspend top 3 flagged drivers</button>
             <button className="w-full rounded-2xl border border-[var(--border)] px-4 py-3" onClick={() => { void bulkOperation({ targetType: 'drivers', action: 'approve', ids: drivers.filter(driver => driver.status === 'pending').slice(0, 3).map(driver => driver.userId) }); }} type="button">Approve first 3 pending drivers</button>
             <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--muted)]">Messaging is surfaced through audit-ready support replies and account actions while dedicated broadcast messaging is implemented on the backend.</div>
              {bulkJobs.filter(job => job.targetType === 'drivers').slice(0, 2).map(job => (
                <div key={job.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--muted)]">
                  {job.action} • {job.succeeded}/{job.total} complete • {formatDate(job.requestedAt)}
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {section === 'rides' ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Active rides" description="Ride list with fare, route status, and cancellation monitoring.">
            <div className="space-y-3">
              {rides.map(ride => (
                <div key={String(ride.id)} className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Ride {String(ride.id).slice(-8)}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">Status {String(ride.status)} • Driver {String(ride.driverId || 'Unassigned')} • Rider {String(ride.riderId || 'Unknown')}</p>
                    </div>
                    <Badge tone={String(ride.status) === 'canceled' ? 'danger' : String(ride.status) === 'completed' ? 'success' : 'warning'}>{String(ride.status)}</Badge>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-3">
                    <div>Fare {formatCurrency(Number(ride.fareEstimate || 0) * 100)}</div>
                    <div>ETA {String(ride.minutes || 0)} min</div>
                    <div>Distance {String(ride.miles || 0)} mi</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Disputes & cancellations" description="Use support tickets plus cancellation reasons to manage ride disputes.">
            <div className="space-y-3">
              {tickets.filter(ticket => ['billing', 'refund'].includes(ticket.type) || /charge|refund|cancel/i.test(ticket.message)).slice(0, 6).map(ticket => (
                <div key={ticket.id} className="rounded-2xl border border-[var(--border)] p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{ticket.type}</p>
                    <Badge tone={ticket.status === 'closed' ? 'success' : 'warning'}>{ticket.status}</Badge>
                  </div>
                  <p className="mt-2 text-[var(--muted)]">{ticket.message}</p>
                  <button className="mt-3 rounded-xl bg-[var(--accent)] px-3 py-2 font-semibold text-[var(--accent-foreground)]" onClick={() => { void updateTicket(ticket.id, 'closed', 'Ride dispute reviewed and closed'); }} type="button">Resolve dispute</button>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {section === 'payments' ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Transaction ledger" description="Captured, refunded, and pending payment activity.">
            <div className="space-y-3">
              {payments.slice(0, 10).map(payment => (
                <div key={payment.id} className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
                  <div>
                    <p className="font-semibold">{payment.id}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">Ride {payment.rideId || 'n/a'}</p>
                  </div>
                  <div className="text-sm">{formatCurrency(payment.amountCents)}</div>
                  <div><Badge tone={payment.status === 'captured' ? 'success' : payment.status === 'refunded' ? 'danger' : 'warning'}>{payment.status}</Badge></div>
                  <div className="text-sm text-[var(--muted)]">{formatDate(payment.updatedAt)}</div>
                </div>
              ))}
            </div>
          </SectionCard>
          <div className="space-y-6">
            <SectionCard title="Wallet and payout exposure" description="Driver balances, pending settlements, and refund totals.">
              <div className="grid gap-4 md:grid-cols-2">
                <StatCard label="Wallet exposure" value={formatCurrency(overview.analytics.finance.walletExposureCents)} />
                <StatCard label="Pending settlement" value={formatCurrency(overview.analytics.finance.pendingSettlementCents)} tone="warning" />
                <StatCard label="Refunded" value={formatCurrency(overview.analytics.finance.refundedCents)} tone="danger" />
                <StatCard label="Refund count" value={String(refunds.length)} helper="Includes dispute reversals" />
              </div>
            </SectionCard>
            <SectionCard title="Recent wallet activity" description="Top-ups, cash-outs, bonuses, and penalties.">
              <div className="space-y-3 text-sm text-[var(--muted)]">
                {overview.walletLedger.slice(0, 6).map(tx => (
                  <div key={tx.id} className="rounded-2xl border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{tx.reason}</p>
                      <Badge tone={tx.kind === 'credit' ? 'success' : 'danger'}>{tx.kind}</Badge>
                    </div>
                    <p className="mt-2">{tx.userId} • {formatCurrency(tx.amountCents)}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {section === 'users' ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Users" description="Searchable roster of riders, drivers, merchants, and admins.">
            <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
              <input className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm" placeholder="Search by email, phone, or id" value={userSearch} onChange={event => setUserSearch(event.target.value)} />
              <select className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm" value={userRoleFilter} onChange={event => setUserRoleFilter(event.target.value)}>
                <option value="all">All roles</option>
                <option value="rider">Riders</option>
                <option value="driver">Drivers</option>
                <option value="merchant">Merchants</option>
                <option value="admin">Admins</option>
              </select>
            </div>
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-4">
                  <div>
                    <p className="font-semibold">{user.email || user.phone || user.id}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">Role {user.role} • Created {formatDate(user.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge>{user.role}</Badge>
                    <button className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm" onClick={() => { void suspendUser(user.id, !(user as { suspended?: boolean }).suspended); }} type="button">{(user as { suspended?: boolean }).suspended ? 'Reactivate' : 'Suspend'}</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <div className="space-y-6">
            <SectionCard title="Bulk user actions" description="Apply actions to the filtered segment and review recent batch history.">
              <div className="space-y-3 text-sm">
                <button className="w-full rounded-2xl border border-[var(--border)] px-4 py-3" onClick={() => { void bulkOperation({ targetType: 'users', action: 'suspend', ids: users.slice(0, 10).map(user => user.id) }); }} type="button">Suspend first 10 filtered users</button>
                <button className="w-full rounded-2xl border border-[var(--border)] px-4 py-3" onClick={() => { void bulkOperation({ targetType: 'users', action: 'activate', ids: users.filter(user => user.suspended).slice(0, 10).map(user => user.id) }); }} type="button">Reactivate suspended segment</button>
                {bulkJobs.filter(job => job.targetType === 'users').slice(0, 3).map(job => (
                  <div key={job.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--muted)]">
                    {job.action} • {job.succeeded}/{job.total} succeeded • {formatDate(job.requestedAt)}
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Support demand by user" description="Quick view of the riders with the highest support volume and spending.">
              <div className="space-y-3">
              {overview.riders.slice(0, 6).map(rider => (
                <div key={rider.user.id} className="rounded-2xl border border-[var(--border)] p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{rider.user.email || rider.user.id}</p>
                    <Badge tone="success">{rider.retentionScore}% retained</Badge>
                  </div>
                  <p className="mt-2 text-[var(--muted)]">{rider.tripCount} trips • {formatCurrency(rider.spendingCents)}</p>
                </div>
              ))}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {section === 'support' ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Ticket dashboard" description="Open, in-review, and resolved support queues.">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Open" value={String(overview.analytics.support.open)} tone="danger" />
              <StatCard label="In review" value={String(overview.analytics.support.pending)} tone="warning" />
              <StatCard label="Resolved" value={String(overview.analytics.support.resolved)} tone="success" />
            </div>
            <div className="mt-4 space-y-3">
              {tickets.slice(0, 8).map(ticket => (
                <div key={ticket.id} className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{ticket.type}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{ticket.user?.email || ticket.userId}</p>
                    </div>
                    <Badge tone={ticket.status === 'closed' ? 'success' : ticket.status === 'in_review' ? 'warning' : 'danger'}>{ticket.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted)]">{ticket.message}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Ticket detail & resolution" description="Add internal notes, reply to the customer, and close the case.">
            {selectedTicket ? (
              <form
                className="space-y-4"
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  void replyTicket(selectedTicket.id, replyMessage);
                  void updateTicket(selectedTicket.id, 'closed', resolution);
                }}
              >
                <div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">{selectedTicket.type}</p>
                  <p className="mt-2">{selectedTicket.message}</p>
                </div>
                <label className="block text-sm font-medium">
                  Customer follow-up
                  <textarea className="mt-2 min-h-28" value={replyMessage} onChange={event => setReplyMessage(event.target.value)} />
                </label>
                <label className="block text-sm font-medium">
                  Resolution note
                  <textarea className="mt-2 min-h-24" value={resolution} onChange={event => setResolution(event.target.value)} />
                </label>
                <button className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]" type="submit">Reply and close ticket</button>
              </form>
            ) : (
              <p className="text-sm text-[var(--muted)]">No tickets available.</p>
            )}
          </SectionCard>
        </div>
      ) : null}

      {section === 'safety' ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Safety incidents" description="Reported incidents, SOS calls, and compliance follow-up.">
            <div className="space-y-3">
              {incidents.map(incident => (
                <div key={incident.id} className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{incident.type}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">{incident.user?.email || incident.userId || 'Anonymous'} • {formatDate(incident.createdAt)}</p>
                    </div>
                    <Badge tone={incident.status === 'resolved' ? 'success' : incident.status === 'dismissed' ? 'default' : 'danger'}>{incident.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted)]">{incident.details || 'No details captured.'}</p>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Escalation workflow" description="Update the current lead incident and record follow-up actions.">
            {selectedIncident ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">
                  <p className="font-semibold text-[var(--foreground)]">{selectedIncident.type}</p>
                  <p className="mt-2">{selectedIncident.details || 'No details provided.'}</p>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <button className="rounded-2xl border border-[var(--border)] px-4 py-3" onClick={() => { void updateIncident(selectedIncident.id, 'under_review', 'Escalated to compliance team'); }} type="button">Mark under review</button>
                  <button className="rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]" onClick={() => { void updateIncident(selectedIncident.id, 'resolved', 'Incident closed after safety review'); }} type="button">Resolve incident</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted)]">No incidents available.</p>
            )}
          </SectionCard>
        </div>
      ) : null}

      {section === 'promotions' ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <SectionCard title="Promo code management" description="Create, edit, and deactivate rider discounts and incentives.">
            <form
              className="grid gap-4"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void upsertPromo({ ...promoForm, discountValue: Number(promoForm.discountValue) });
              }}
            >
              <label className="text-sm font-medium">Promo code<input className="mt-2" value={promoForm.code} onChange={event => setPromoForm(current => ({ ...current, code: event.target.value.toUpperCase() }))} /></label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">Type<select className="mt-2" value={promoForm.discountType} onChange={event => setPromoForm(current => ({ ...current, discountType: event.target.value }))}><option value="percent">Percent</option><option value="flat">Flat</option></select></label>
                <label className="text-sm font-medium">Value<input className="mt-2" value={promoForm.discountValue} onChange={event => setPromoForm(current => ({ ...current, discountValue: event.target.value }))} /></label>
              </div>
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"><input checked={promoForm.active} className="h-4 w-4" onChange={event => setPromoForm(current => ({ ...current, active: event.target.checked }))} type="checkbox" /> Active</label>
              <button className="rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]" type="submit">Save promo</button>
            </form>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              {(overview.promos as Array<{ id: string; code: string; discountValue: number; discountType: string; active?: boolean }>).map(promo => (
                <div key={promo.id} className="rounded-2xl border border-[var(--border)] p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{promo.code}</p>
                    <p className="mt-1">{promo.discountValue} {promo.discountType}</p>
                  </div>
                  <Badge tone={promo.active === false ? 'danger' : 'success'}>{promo.active === false ? 'inactive' : 'active'}</Badge>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Markets & referrals" description="Launch cities, monitor regional status, and referral reward activity.">
            <form
              className="grid gap-4"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void upsertMarket(marketForm);
              }}
            >
              <label className="text-sm font-medium">Market name<input className="mt-2" value={marketForm.name} onChange={event => setMarketForm(current => ({ ...current, name: event.target.value }))} /></label>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium">City<input className="mt-2" value={marketForm.city} onChange={event => setMarketForm(current => ({ ...current, city: event.target.value }))} /></label>
                <label className="text-sm font-medium">Country<input className="mt-2" value={marketForm.country} onChange={event => setMarketForm(current => ({ ...current, country: event.target.value }))} /></label>
                <label className="text-sm font-medium">Status<select className="mt-2" value={marketForm.status} onChange={event => setMarketForm(current => ({ ...current, status: event.target.value }))}><option value="pre_launch">Pre-launch</option><option value="active">Active</option><option value="paused">Paused</option><option value="sunset">Sunset</option></select></label>
              </div>
              <button className="rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]" type="submit">Save market</button>
            </form>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              {(overview.markets as Array<{ id: string; city: string; country: string; status: string }>).map(market => (
                <div key={market.id} className="rounded-2xl border border-[var(--border)] p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{market.city}, {market.country}</p>
                  </div>
                  <Badge tone={market.status === 'active' ? 'success' : 'warning'}>{market.status}</Badge>
                </div>
              ))}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">Referral events tracked: {overview.referralEvents.length}</div>
            </div>
          </SectionCard>
        </div>
      ) : null}

      {section === 'settings' ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <SectionCard title="System settings" description="Maintenance mode, feature flags, commission, and surge controls.">
            <form
              className="grid gap-4"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void updateSettings({
                  maintenanceMode: settingsForm.maintenanceMode,
                  commissionRatePercent: Number(settingsForm.commissionRatePercent),
                  surgeMultiplier: Number(settingsForm.surgeMultiplier),
                  appVersion: settingsForm.appVersion,
                  featureFlags: overview.settings.featureFlags
                });
              }}
            >
              <label className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-3 text-sm"><input checked={settingsForm.maintenanceMode} className="h-4 w-4" onChange={event => setSettingsForm(current => ({ ...current, maintenanceMode: event.target.checked }))} type="checkbox" /> Maintenance mode</label>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium">Commission %<input className="mt-2" value={settingsForm.commissionRatePercent} onChange={event => setSettingsForm(current => ({ ...current, commissionRatePercent: event.target.value }))} /></label>
                <label className="text-sm font-medium">Surge multiplier<input className="mt-2" value={settingsForm.surgeMultiplier} onChange={event => setSettingsForm(current => ({ ...current, surgeMultiplier: event.target.value }))} /></label>
                <label className="text-sm font-medium">App version<input className="mt-2" value={settingsForm.appVersion} onChange={event => setSettingsForm(current => ({ ...current, appVersion: event.target.value }))} /></label>
              </div>
              <div className="space-y-2 rounded-2xl border border-[var(--border)] p-4 text-sm">
                {overview.settings.featureFlags.map(flag => (
                  <label key={flag.key} className="flex items-center justify-between gap-3"><span>{flag.label}</span><Badge tone={flag.enabled ? 'success' : 'warning'}>{flag.enabled ? 'enabled' : 'disabled'}</Badge></label>
                ))}
              </div>
              <button className="rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]" type="submit">Save settings</button>
            </form>
          </SectionCard>
          <SectionCard title="Admin users & API keys" description="Manage administrative access and report integration keys.">
            <div className="space-y-3 text-sm text-[var(--muted)]">
              {users.filter(user => user.role === 'admin').map(user => (
                <div key={user.id} className="rounded-2xl border border-[var(--border)] p-4">{user.email || user.id}</div>
              ))}
            </div>
            <form
              className="mt-4 grid gap-4"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void createApiKey(apiKeyName);
              }}
            >
              <label className="text-sm font-medium">New API key name<input className="mt-2" value={apiKeyName} onChange={event => setApiKeyName(event.target.value)} /></label>
              <button className="rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]" type="submit">Generate API key</button>
            </form>
            {lastApiKey ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">Copy this key now: <code>{lastApiKey}</code></div> : null}
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              {overview.apiKeys.map(apiKey => (
                <div key={apiKey.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] p-4">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{apiKey.name}</p>
                    <p className="mt-1">{apiKey.keyPreview}</p>
                  </div>
                  <button className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm" onClick={() => { void revokeApiKey(apiKey.id); }} type="button">{apiKey.revokedAt ? 'Revoked' : 'Revoke'}</button>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {section === 'reports' ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <SectionCard title="Revenue & operations reports" description="Exportable summaries by timeframe and operational dimension.">
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard label="Revenue" value={formatCurrency(overview.analytics.finance.capturedRevenueCents)} tone="success" />
              <StatCard label="Trips" value={String(overview.stats.totalRides)} />
              <StatCard label="Users" value={String(overview.stats.totalUsers)} />
              <StatCard label="Incidents" value={String(overview.stats.openIncidents)} tone="warning" />
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">Use the export button above to download CSV snapshots for finance, driver performance, rider behaviour, and safety reporting. Print/PDF renders the current section for distribution.</div>
          </SectionCard>
          <SectionCard title="Advanced export center" description="Select format, columns, and filters, then reuse previous export jobs.">
            <form
              className="grid gap-4"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void handleAdvancedExport();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">Data type<select className="mt-2" value={exportForm.dataType} onChange={event => setExportForm(current => ({ ...current, dataType: event.target.value }))}><option value="users">Users</option><option value="drivers">Drivers</option><option value="rides">Rides</option><option value="transactions">Transactions</option><option value="tickets">Support tickets</option><option value="restaurants">Restaurants</option><option value="orders">Orders</option><option value="reviews">Reviews</option></select></label>
                <label className="text-sm font-medium">Format<select className="mt-2" value={exportForm.format} onChange={event => setExportForm(current => ({ ...current, format: event.target.value }))}><option value="csv">CSV</option><option value="json">JSON</option><option value="xml">XML</option><option value="xlsx">Excel</option></select></label>
              </div>
              <label className="text-sm font-medium">Columns (comma separated)<input className="mt-2" value={exportForm.columns} onChange={event => setExportForm(current => ({ ...current, columns: event.target.value }))} /></label>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium">Search filter<input className="mt-2" value={exportForm.search} onChange={event => setExportForm(current => ({ ...current, search: event.target.value }))} /></label>
                <label className="text-sm font-medium">Date from<input className="mt-2" type="date" value={exportForm.dateFrom} onChange={event => setExportForm(current => ({ ...current, dateFrom: event.target.value }))} /></label>
                <label className="text-sm font-medium">Date to<input className="mt-2" type="date" value={exportForm.dateTo} onChange={event => setExportForm(current => ({ ...current, dateTo: event.target.value }))} /></label>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]" type="submit">Run export</button>
                <button className="rounded-2xl border border-[var(--border)] px-4 py-3" onClick={() => window.print()} type="button">Print / PDF</button>
              </div>
            </form>
            <div className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
              {exportJobs.slice(0, 4).map(job => (
                <div key={job.id} className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{job.dataType} • {job.format.toUpperCase()}</p>
                      <p className="mt-1">{job.rowCount} rows • {formatDate(job.requestedAt)}</p>
                    </div>
                    <button className="rounded-xl border border-[var(--border)] px-3 py-2" onClick={() => { void handleAdvancedExport({ dataType: job.dataType, format: job.format, columns: job.columns.join(','), search: String(job.filters?.search || '') }); }} type="button">Reuse</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Import center" description="Preview and confirm bulk user, market, promo, and configuration imports with rollback history.">
            <form
              className="grid gap-4"
              onSubmit={(event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                void importData({ ...importForm, previewOnly: true });
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium">Import type<select className="mt-2" value={importForm.dataType} onChange={event => setImportForm(current => ({ ...current, dataType: event.target.value }))}><option value="users">Users</option><option value="promos">Promo codes</option><option value="markets">Markets</option><option value="settings">Configuration</option></select></label>
                <label className="text-sm font-medium">Format<select className="mt-2" value={importForm.format} onChange={event => setImportForm(current => ({ ...current, format: event.target.value }))}><option value="json">JSON</option><option value="csv">CSV</option><option value="xlsx">Excel</option><option value="api">API payload</option></select></label>
              </div>
              <label className="text-sm font-medium" htmlFor="admin-import-file">Upload file</label>
              <input className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm" id="admin-import-file" accept=".json,.csv,.xlsx" onChange={event => { void handleImportFileChange(event); }} type="file" />
              {importFileName ? <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)]">{importFileName}</div> : null}
              <label className="text-sm font-medium">Payload<textarea className="mt-2 min-h-32" placeholder='[{"email":"ops@example.com","password":"TempPass123!","role":"driver"}]' value={importForm.content} onChange={event => setImportForm(current => ({ ...current, content: event.target.value }))} /></label>
              <div className="flex flex-wrap gap-3">
                <button className="rounded-2xl border border-[var(--border)] px-4 py-3" type="submit">Preview import</button>
                <button className="rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)]" onClick={() => { void importData({ ...importForm, confirm: true, previewOnly: false }); }} type="button">Confirm import</button>
              </div>
            </form>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              {importJobs.slice(0, 4).map(job => (
                <div key={job.id} className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{job.dataType} • {job.status}</p>
                      <p className="mt-1">{job.importedCount}/{job.totalRecords} imported • {job.duplicateCount} duplicates • {job.errorCount} errors</p>
                    </div>
                    {job.status === 'completed' ? <button className="rounded-xl border border-[var(--border)] px-3 py-2" onClick={() => { void importData({ rollbackImportId: job.id }); }} type="button">Rollback</button> : null}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Compliance & audit reports" description="Review financial, tax, regulatory, and audit-readiness snapshots.">
            <div className="grid gap-4 md:grid-cols-2">
              {complianceReports.map(report => (
                <StatCard key={report.label} label={report.label} value={report.value} helper={report.helper} />
              ))}
            </div>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              {overview.auditLogs.slice(0, 5).map(log => (
                <div key={String(log.id)} className="rounded-2xl border border-[var(--border)] p-4">
                  <p className="font-semibold text-[var(--foreground)]">{String(log.action)}</p>
                  <p className="mt-1">{String(log.targetType || 'system')} • {formatDate(String(log.createdAt || ''))}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}

function buildExportRows(section: SectionKey, overview: ReturnType<typeof useAdmin>['overview']) {
  if (!overview) return [];
  switch (section) {
    case 'drivers':
      return overview.drivers.map(driver => ({ driver: driver.user?.email || driver.userId, status: driver.status, rating: driver.rating, earningsCents: driver.earningsCents, tripCount: driver.tripCount }));
    case 'payments':
      return overview.payments.map(payment => ({ paymentId: payment.id, status: payment.status, amountCents: payment.amountCents, rideId: payment.rideId || '', updatedAt: payment.updatedAt }));
    case 'support':
      return overview.tickets.map(ticket => ({ ticketId: ticket.id, type: ticket.type, status: ticket.status, user: ticket.user?.email || ticket.userId, updatedAt: ticket.updatedAt }));
    case 'safety':
      return overview.incidents.map(incident => ({ incidentId: incident.id, type: incident.type, status: incident.status, user: incident.user?.email || incident.userId || '', createdAt: incident.createdAt }));
    default:
      return [
        { metric: 'totalUsers', value: overview.stats.totalUsers },
        { metric: 'totalRides', value: overview.stats.totalRides },
        { metric: 'totalRevenueCents', value: overview.stats.totalRevenueCents },
        { metric: 'openTickets', value: overview.stats.openTickets },
        { metric: 'openIncidents', value: overview.stats.openIncidents }
      ];
  }
}
