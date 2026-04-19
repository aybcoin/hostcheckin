import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus2, CheckCircle2, FileSignature } from 'lucide-react';
import { Reservation, supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';

interface RecentActivitiesProps {
  reservations: Reservation[];
}

interface ContractActivity {
  reservation_id: string;
  signed_by_guest: boolean;
  signed_at?: string | null;
  created_at: string;
}

interface ActivityItem {
  id: string;
  label: string;
  bookingReference: string;
  at: string;
  type: 'checkin' | 'reservation' | 'contract';
}

function relativeTime(value: string): string {
  const date = new Date(value);
  const delta = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(delta / 60000));
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

export function RecentActivities({ reservations }: RecentActivitiesProps) {
  const [contracts, setContracts] = useState<ContractActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      if (reservations.length === 0) {
        setContracts([]);
        setLoading(false);
        return;
      }

      const reservationIds = reservations.map((reservation) => reservation.id);
      const { data, error: fetchError } = await supabase
        .from('contracts')
        .select('reservation_id, signed_by_guest, signed_at, created_at')
        .in('reservation_id', reservationIds);

      if (fetchError) {
        setError('Impossible de charger les activités contractuelles.');
        setLoading(false);
        return;
      }

      setError(null);
      setContracts((data || []) as ContractActivity[]);
      setLoading(false);
    };

    void fetchContracts();
  }, [reservations]);

  const items = useMemo<ActivityItem[]>(() => {
    const activities: ActivityItem[] = [];
    const reservationById = new Map(reservations.map((reservation) => [reservation.id, reservation]));

    reservations.forEach((reservation) => {
      activities.push({
        id: `reservation-${reservation.id}`,
        type: 'reservation',
        label: 'Nouvelle réservation créée',
        bookingReference: reservation.booking_reference,
        at: reservation.created_at,
      });

      if (reservation.status === 'checked_in' || reservation.status === 'completed') {
        activities.push({
          id: `checkin-${reservation.id}`,
          type: 'checkin',
          label: 'Check-in complété',
          bookingReference: reservation.booking_reference,
          at: reservation.updated_at,
        });
      }
    });

    contracts.forEach((contract, index) => {
      if (!contract.signed_by_guest) return;
      const reservation = reservationById.get(contract.reservation_id);
      if (!reservation) return;
      activities.push({
        id: `contract-${reservation.id}-${index}`,
        type: 'contract',
        label: 'Contrat signé',
        bookingReference: reservation.booking_reference,
        at: contract.signed_at || contract.created_at,
      });
    });

    return activities
      .sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime())
      .slice(0, 5);
  }, [contracts, reservations]);

  return (
    <Card as="section" variant="default" padding="md">
      <h3 className="text-lg font-semibold text-slate-900">Activités récentes</h3>
      <p className="text-sm text-slate-600">Les 5 derniers événements importants.</p>

      {loading ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          Chargement des activités…
        </div>
      ) : error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
          Aucune activité récente pour le moment.
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.map((item) => {
            const Icon =
              item.type === 'reservation'
                ? CalendarPlus2
                : item.type === 'checkin'
                  ? CheckCircle2
                  : FileSignature;
            return (
              <li key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon size={16} className="shrink-0 text-slate-700" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="truncate text-xs text-slate-500">{item.bookingReference}</p>
                  </div>
                </div>
                <p className="shrink-0 text-xs text-slate-500">{relativeTime(item.at)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
