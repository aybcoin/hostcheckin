import { ArrowRight, BarChart3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { clsx } from '../../lib/clsx';
import { computeAvgLengthOfStay, computeOccupancyTrend } from '../../lib/analytics-logic';
import { borderTokens, textTokens } from '../../lib/design-tokens';
import { formatCurrency } from '../../lib/format';
import { resolvePeriod } from '../../lib/finance-logic';
import { fr } from '../../lib/i18n/fr';
import { formatOccupancyPct } from '../../lib/property-stats-logic';
import { supabase, type Property, type Reservation } from '../../lib/supabase';
import type { FinanceTransaction, Period } from '../../types/finance';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

interface AnalyticsSnapshotCardProps {
  hostId: string;
  onSeeAll: () => void;
}

interface PropertyRow {
  id: string;
  name: string;
  host_id: string;
}

type ReservationRow = Pick<
  Reservation,
  'id' | 'property_id' | 'check_in_date' | 'check_out_date' | 'total_amount' | 'status' | 'created_at'
>;

interface SnapshotMetrics {
  revenue: number;
  occupancy: number;
  avgStay: number;
}

const SNAPSHOT_PERIOD = resolvePeriod('last_30_days');

function buildMonthBuckets(period: Period): string[] {
  const [startYear, startMonth] = period.start.slice(0, 7).split('-').map(Number);
  const [endYear, endMonth] = period.end.slice(0, 7).split('-').map(Number);

  if (!Number.isFinite(startYear) || !Number.isFinite(startMonth)) return [];
  if (!Number.isFinite(endYear) || !Number.isFinite(endMonth)) return [];

  const buckets: string[] = [];
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, 1));
  const last = new Date(Date.UTC(endYear, endMonth - 1, 1));

  while (cursor.getTime() <= last.getTime()) {
    buckets.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return buckets;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function inflateProperty(row: PropertyRow): Property {
  return {
    id: row.id,
    host_id: row.host_id,
    name: row.name,
    address: '',
    city: '',
    postal_code: undefined,
    country: '',
    description: undefined,
    rooms_count: 0,
    bathrooms_count: 0,
    max_guests: 0,
    amenities: [],
    check_in_time: undefined,
    check_out_time: undefined,
    verification_mode: 'simple',
    auto_link_active: false,
    auto_link_regenerated_at: null,
    base_nightly_rate: null,
    pricing_currency: 'EUR',
    image_url: undefined,
    created_at: '',
    updated_at: '',
  };
}

function inflateReservation(row: ReservationRow): Reservation {
  return {
    id: row.id,
    property_id: row.property_id,
    guest_id: null,
    check_in_date: row.check_in_date,
    check_out_date: row.check_out_date,
    number_of_guests: 0,
    booking_reference: '',
    unique_link: '',
    status: row.status,
    total_amount: row.total_amount == null ? null : Number(row.total_amount),
    verification_type: 'simple',
    verification_mode: 'simple',
    smart_lock_code: null,
    guest_rating: undefined,
    cancelled_at: undefined,
    notes: null,
    external_source: null,
    external_uid: null,
    external_feed_id: null,
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

export function AnalyticsSnapshotCard({ hostId, onSeeAll }: AnalyticsSnapshotCardProps) {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SnapshotMetrics>({ revenue: 0, occupancy: 0, avgStay: 0 });

  useEffect(() => {
    let active = true;

    const fetchMetrics = async () => {
      setLoading(true);

      try {
        const [propertiesResult, transactionsResult] = await Promise.all([
          supabase
            .from('properties')
            .select('id, name, host_id')
            .eq('host_id', hostId)
            .order('name', { ascending: true }),
          supabase
            .from('finance_transactions')
            .select('*')
            .eq('host_id', hostId)
            .gte('occurred_on', SNAPSHOT_PERIOD.start)
            .lte('occurred_on', SNAPSHOT_PERIOD.end)
            .order('occurred_on', { ascending: false }),
        ]);

        if (propertiesResult.error) throw propertiesResult.error;
        if (transactionsResult.error) throw transactionsResult.error;

        const properties = ((propertiesResult.data ?? []) as PropertyRow[]).map(inflateProperty);
        const propertyIds = properties.map((property) => property.id);
        const reservationsResult = propertyIds.length > 0
          ? await supabase
            .from('reservations')
            .select('id, property_id, check_in_date, check_out_date, total_amount, status, created_at')
            .in('property_id', propertyIds)
            .gte('check_in_date', SNAPSHOT_PERIOD.start)
            .lte('check_in_date', SNAPSHOT_PERIOD.end)
            .order('check_in_date', { ascending: true })
          : { data: [] as ReservationRow[], error: null };

        if (reservationsResult.error) throw reservationsResult.error;

        const reservations = ((reservationsResult.data ?? []) as ReservationRow[]).map(inflateReservation);
        const transactions = (transactionsResult.data ?? []) as FinanceTransaction[];
        const occupancyPoints = computeOccupancyTrend({
          reservations,
          properties,
          months: buildMonthBuckets(SNAPSHOT_PERIOD),
        });

        const revenue = reservations
          .filter((reservation) => reservation.status !== 'cancelled')
          .reduce((sum, reservation) => sum + (reservation.total_amount ?? 0), 0)
          + transactions
            .filter((transaction) => transaction.kind === 'income')
            .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

        if (!active) return;

        setMetrics({
          revenue,
          occupancy: average(occupancyPoints.map((point) => point.rate)),
          avgStay: computeAvgLengthOfStay(reservations),
        });
      } catch (fetchError) {
        console.error('[AnalyticsSnapshotCard] Failed to load analytics snapshot:', fetchError);
        if (!active) return;
        setMetrics({ revenue: 0, occupancy: 0, avgStay: 0 });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchMetrics();

    return () => {
      active = false;
    };
  }, [hostId]);

  const hasData = useMemo(
    () => metrics.revenue > 0 || metrics.occupancy > 0 || metrics.avgStay > 0,
    [metrics.avgStay, metrics.occupancy, metrics.revenue],
  );

  return (
    <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
      <header className="flex items-center justify-between gap-2">
        <h2 className={clsx('flex items-center gap-2 text-base font-semibold', textTokens.title)}>
          <BarChart3 aria-hidden size={16} />
          {fr.analytics.snapshot.cardTitle}
        </h2>
        <Button variant="tertiary" size="sm" onClick={onSeeAll}>
          {fr.analytics.snapshot.seeAll}
          <ArrowRight aria-hidden size={14} />
        </Button>
      </header>

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="text" className="h-4 w-full" />
          ))}
        </div>
      ) : !hasData ? (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <MiniMetric label={fr.analytics.snapshot.revenue} value="—" />
          <MiniMetric label={fr.analytics.snapshot.occupancy} value="—" />
          <MiniMetric label={fr.analytics.snapshot.avgStay} value="—" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-sm">
          <MiniMetric label={fr.analytics.snapshot.revenue} value={formatCurrency(metrics.revenue)} />
          <MiniMetric label={fr.analytics.snapshot.occupancy} value={formatOccupancyPct(metrics.occupancy)} />
          <MiniMetric
            label={fr.analytics.snapshot.avgStay}
            value={`${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(metrics.avgStay)} j`}
          />
        </div>
      )}
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className={clsx('rounded-lg border px-2 py-2', borderTokens.subtle)}>
      <p className={clsx('text-[11px]', textTokens.subtle)}>{label}</p>
      <p className={clsx('text-sm font-semibold', textTokens.title)}>{value}</p>
    </div>
  );
}
