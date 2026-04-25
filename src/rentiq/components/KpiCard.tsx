interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
}

export function KpiCard({ label, value, hint }: KpiCardProps) {
  return (
    <article className="rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--rq-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-100">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </article>
  );
}
