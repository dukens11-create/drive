import type { ReactNode } from 'react';

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-3xl border border-white/10 bg-white/6 p-5 shadow-lg shadow-slate-950/20 backdrop-blur', className)}>{children}</section>;
}

export function Button({ children, className, tone = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; tone?: 'primary' | 'secondary' | 'ghost' }) {
  const tones = {
    primary: 'bg-sky-400 text-slate-950 hover:bg-sky-300',
    secondary: 'bg-white/10 text-white hover:bg-white/15',
    ghost: 'bg-transparent text-slate-200 hover:bg-white/8',
  };
  return <button className={cn('inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition', tones[tone], className)} {...props}>{children}</button>;
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-slate-200', className)}>{children}</span>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('min-h-11 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-400', props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn('min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-400', props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn('min-h-11 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white', props.className)} />;
}

export function SectionTitle({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-300">{eyebrow}</p> : null}
        <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="space-y-2">
      <p className="text-sm text-slate-300">{label}</p>
      <p className="text-3xl font-semibold text-white">{value}</p>
      <p className="text-xs text-slate-400">{hint}</p>
    </Card>
  );
}

export function LanguageSwitcher({ locale, localeLabel, locales, localeLabels, onChange }: {
  locale: string;
  localeLabel: string;
  locales: string[];
  localeLabels: Record<string, string>;
  onChange: (locale: string) => void;
}) {
  return (
    <select
      value={locale}
      onChange={(e) => onChange(e.target.value)}
      aria-label={localeLabel}
      className="min-h-9 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-1.5 text-sm text-white"
    >
      {locales.map((code) => (
        <option key={code} value={code}>
          {localeLabels[code] ?? code}
        </option>
      ))}
    </select>
  );
}
