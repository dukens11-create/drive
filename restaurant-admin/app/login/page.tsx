'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers';

export default function LoginPage() {
  const router = useRouter();
  const { login, requestPasswordReset, verifyEmail, session, ready } = useAuth();
  const [mode, setMode] = useState<'login' | 'verify' | 'reset'>('login');
  const [email, setEmail] = useState('owner@restaurant.com');
  const [password, setPassword] = useState('demo-password');
  const [rememberMe, setRememberMe] = useState(true);
  const [code, setCode] = useState('123456');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace('/dashboard');
  }, [ready, router, session]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'login') {
        await login(email, password, rememberMe);
        router.replace('/dashboard');
      } else if (mode === 'verify') {
        await verifyEmail(code);
        setMessage('Email verified. You can now sign in.');
      } else {
        await requestPasswordReset(email);
        setMessage('Password reset link has been generated for this demo account.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to continue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)]">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[linear-gradient(135deg,#1f2937,#f97316)] p-8 text-white shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-100">Drive restaurant suite</p>
          <h1 className="mt-6 text-4xl font-bold tracking-tight">Control menu, kitchen, orders, staff, analytics, and payouts in one place.</h1>
          <div className="mt-8 grid gap-3 text-sm md:grid-cols-2">
            {['Real-time incoming order alerts', 'Kitchen display and status timeline', 'Menu categories, variants, and bulk edits', 'Revenue, ratings, and report exports'].map(item => (
              <div key={item} className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">{item}</div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl">
          <h2 className="text-2xl font-semibold">Restaurant account</h2>
          <div className="mt-5 flex gap-2 rounded-2xl bg-[var(--surface)] p-2 text-sm">
            {([
              ['login', 'Sign in'],
              ['verify', 'Verify email'],
              ['reset', 'Reset password']
            ] as const).map(([value, label]) => (
              <button key={value} type="button" className={`flex-1 rounded-xl px-3 py-2 ${mode === value ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'text-[var(--muted)]'}`} onClick={() => setMode(value)}>{label}</button>
            ))}
          </div>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {(mode === 'login' || mode === 'reset') && (
              <label className="block text-sm font-medium">Email<input className="mt-2" type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
            )}
            {mode === 'login' && (
              <>
                <label className="block text-sm font-medium">Password<input className="mt-2" type="password" value={password} onChange={event => setPassword(event.target.value)} required /></label>
                <label className="flex items-center gap-2 text-sm text-[var(--muted)]"><input className="h-4 w-4" type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} />Remember me</label>
              </>
            )}
            {mode === 'verify' && (
              <label className="block text-sm font-medium">Verification code<input className="mt-2" value={code} onChange={event => setCode(event.target.value)} pattern="[0-9]{6}" required /></label>
            )}
            {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            {message ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
            <button className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 font-semibold text-[var(--accent-foreground)] disabled:opacity-60" disabled={submitting} type="submit">
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'verify' ? 'Verify email' : 'Send reset link'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
