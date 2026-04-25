import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailyPricing } from '../../types';

interface RevenueOccupancyChartProps {
  dailyPricing: DailyPricing[];
}

export function RevenueOccupancyChart({ dailyPricing }: RevenueOccupancyChartProps) {
  const data = dailyPricing.slice(0, 30).map((entry) => ({
    date: entry.date.slice(5),
    revenu: entry.status === 'free' ? entry.recommendedPrice : entry.currentPrice,
    occupation: entry.status === 'free' ? 0 : 100,
  }));

  return (
    <div className="h-72 rounded-xl border border-[var(--rq-border)] bg-[var(--rq-surface)] p-4">
      <p className="mb-3 text-sm font-medium text-slate-200">Revenu recommandé vs occupation (30j)</p>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#233249" />
          <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" stroke="#94a3b8" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            stroke="#94a3b8"
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: '#111826',
              border: '1px solid #233249',
              borderRadius: 12,
            }}
          />
          <Line yAxisId="left" type="monotone" dataKey="revenu" stroke="#10b981" strokeWidth={2.5} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="occupation" stroke="#60a5fa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
