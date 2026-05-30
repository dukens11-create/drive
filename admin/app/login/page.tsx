'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers';

export default function LoginPage() {
  const router = useRouter();
  const { login, session, ready } = useAuth();
  const [email, setEmail] = useState('admin@flupflap.com');
  const [password, setPassword] = useState('change_me_admin_password');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace('/dashboard');
  }, [ready, router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)]">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.25fr_0.9fr]">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(135deg,#0f172a,#1d4ed8)] p-8 text-white shadow-2xl">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em]">
            Drive operations
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight">Complete platform visibility for drivers, rides, payments, support, and safety.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
            Monitor live operations, manage driver compliance, resolve customer issues, run revenue reports, and configure promotions from one admin workspace.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              'Real-time active ride and driver map',
              'Driver verification and compliance workflows',
              'Payment, wallet, refund, and payout monitoring',
              'Support ticket assignment and safety escalation views'
            ].map(item => (
              <div key={item} className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-slate-100">{item}</div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl">
          <h2 className="text-2xl font-semibold">Admin sign in</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Use the seeded admin account or another account with the backend admin role.</p>
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium">
              Email
              <input className="mt-2" value={email} onChange={event => setEmail(event.target.value)} type="email" required />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input className="mt-2" value={password} onChange={event => setPassword(event.target.value)} type="password" required />
            </label>
            {error ? <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            <button
              className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-60"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)]">Default local admin</p>
            <p className="mt-2">Email: admin@flupflap.com</p>
            <p>Password: change_me_admin_password</p>
          </div>
        </section>
      </div>
    </main>
  );
}
