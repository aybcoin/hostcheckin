import { useMemo } from 'react';
import { Reservation } from '../../lib/supabase';

interface CheckinsTrendChartProps {
  reservations: Reservation[];
}

function getDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function CheckinsTrendChart({ reservations }: CheckinsTrendChartProps) {
  const points = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 30 }).map((_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (29 - index));
      return date;
    });

    const countsByDay = new Map<string, number>();
    reservations.forEach((reservation) => {
      if (reservation.status !== 'checked_in' && reservation.status !== 'completed') {
        return;
      }
      const date = new Date(reservation.check_in_date);
      date.setHours(0, 0, 0, 0);
      const key = getDayKey(date);
      countsByDay.set(key, (countsByDay.get(key) || 0) + 1);
    });

    return days.map((date) => ({
      key: getDayKey(date),
      label: formatLabel(date),
      value: countsByDay.get(getDayKey(date)) || 0,
    }));
  }, [reservations]);

  const maxValue = Math.max(1, ...points.map((point) => point.value));

  const chartPath = useMemo(() => {
    if (points.length === 0) return '';
    const width = 100;
    const height = 100;
    return points
      .map((point, index) => {
        const x = (index / (points.length - 1)) * width;
        const y = height - (point.value / maxValue) * height;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [maxValue, points]);

  const total = points.reduce((sum, point) => sum + point.value, 0);

  if (points.length === 0) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Check-ins sur 30 jours</h3>
        <p className="mt-3 text-sm text-slate-500">Aucune donnée disponible pour le moment.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Check-ins sur 30 jours</h3>
          <p className="text-sm text-slate-600">Tendance quotidienne des check-ins validés.</p>
        </div>
        <p className="text-sm font-medium text-slate-700">{total} check-ins</p>
      </div>

      <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
        <svg viewBox="0 0 100 100" className="h-52 w-full" role="img" aria-label="Courbe des check-ins des 30 derniers jours">
          <path d={chartPath} fill="none" stroke="#0f172a" strokeWidth={1.8} strokeLinecap="round" />
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </section>
  );
}
