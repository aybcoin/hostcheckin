import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { clsx } from '../../lib/clsx';
import { computeReservationBlocks, daysInMonth } from '../../lib/calendar-logic';
import {
  accentTokens,
  borderTokens,
  stateFillTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { Guest, Property, Reservation } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface CalendarViewProps {
  reservations: Reservation[];
  properties: Property[];
  guests: Record<string, Pick<Guest, 'full_name'>>;
  initialMonth?: Date;
  onSelectReservation: (reservation: Reservation) => void;
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function formatReservationRange(reservation: Reservation): string {
  return new Date(reservation.check_in_date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  }) + ` → ${new Date(reservation.check_out_date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  })}`;
}

export function CalendarView({
  reservations,
  properties,
  guests,
  initialMonth = new Date(),
  onSelectReservation,
}: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(() => monthStart(initialMonth));
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const dayCount = daysInMonth(year, month);
  const dayGridStyle = { gridTemplateColumns: `repeat(${dayCount}, minmax(28px, 1fr))` };

  const reservationsById = useMemo(
    () => new Map(reservations.map((reservation) => [reservation.id, reservation])),
    [reservations],
  );

  const blocks = useMemo(
    () => computeReservationBlocks(reservations, year, month),
    [month, reservations, year],
  );

  const blocksByPropertyId = useMemo(() => {
    const grouped = new Map<string, typeof blocks>();
    for (const block of blocks) {
      const bucket = grouped.get(block.propertyId) ?? [];
      bucket.push(block);
      grouped.set(block.propertyId, bucket);
    }
    return grouped;
  }, [blocks]);

  return (
    <Card variant="default" padding="md" className="space-y-4 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={clsx('text-lg font-semibold capitalize', textTokens.title)}>
            {formatMonthLabel(currentMonth)}
          </h2>
          <p className={clsx('text-sm', textTokens.muted)}>{fr.reservations.calendar.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            aria-label={fr.reservations.calendar.previousMonth}
            onClick={() => setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label={fr.reservations.calendar.nextMonth}
            onClick={() => setCurrentMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentMonth(monthStart(new Date()))}
          >
            {fr.reservations.calendar.today}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[960px] space-y-2">
          <div className="grid grid-cols-[200px_minmax(0,1fr)] items-stretch gap-0">
            <div className={clsx('sticky left-0 z-10 border-r px-4 py-3', surfaceTokens.panel, borderTokens.default)}>
              <span className={clsx('text-xs font-semibold uppercase tracking-wide', textTokens.subtle)}>
                {fr.reservations.calendar.propertiesColumn}
              </span>
            </div>
            <div className="grid" style={dayGridStyle}>
              {Array.from({ length: dayCount }, (_, index) => {
                const dayNumber = index + 1;
                const cellDate = new Date(year, month, dayNumber);
                const isToday = cellDate.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={dayNumber}
                    className={clsx(
                      'flex h-12 flex-col items-center justify-center border-b border-r text-center',
                      borderTokens.subtle,
                      isToday ? accentTokens.bgLight : surfaceTokens.panel,
                    )}
                  >
                    <span className={clsx('text-[11px]', textTokens.subtle)}>
                      {cellDate.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                    </span>
                    <span className={clsx('text-sm font-semibold', isToday ? accentTokens.text : textTokens.title)}>
                      {dayNumber}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {properties.map((property) => {
            const propertyBlocks = blocksByPropertyId.get(property.id) ?? [];

            return (
              <div key={property.id} className="grid grid-cols-[200px_minmax(0,1fr)] items-stretch gap-0">
                <div
                  className={clsx(
                    'sticky left-0 z-10 flex h-16 items-center border-r px-4',
                    surfaceTokens.panel,
                    borderTokens.default,
                  )}
                >
                  <div className="min-w-0">
                    <p className={clsx('truncate text-sm font-semibold', textTokens.title)}>{property.name}</p>
                    <p className={clsx('truncate text-xs', textTokens.muted)}>{property.city}</p>
                  </div>
                </div>

                <div className="relative">
                  <div className="grid h-16" style={dayGridStyle}>
                    {Array.from({ length: dayCount }, (_, index) => (
                      <div
                        key={index}
                        className={clsx('border-b border-r', borderTokens.subtle, surfaceTokens.panel)}
                      />
                    ))}
                  </div>

                  {propertyBlocks.map((block) => {
                    const reservation = reservationsById.get(block.reservationId);
                    if (!reservation) {
                      return null;
                    }

                    const guestName = reservation.guest_id
                      ? guests[reservation.guest_id]?.full_name ?? fr.app.guestFallbackName
                      : fr.app.guestFallbackName;

                    return (
                      <button
                        key={block.reservationId}
                        type="button"
                        onClick={() => onSelectReservation(reservation)}
                        title={`${guestName} · ${formatReservationRange(reservation)}`}
                        className={clsx(
                          'absolute top-2 flex h-12 items-center overflow-hidden rounded-lg border-l-2 px-2 text-left shadow-sm',
                          stateFillTokens.success,
                          accentTokens.activeNavBorder,
                          textTokens.body,
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2',
                        )}
                        style={{
                          left: `calc(${((block.startDay - 1) / dayCount) * 100}% + 2px)`,
                          width: `calc(${(block.span / dayCount) * 100}% - 4px)`,
                        }}
                      >
                        <span className="truncate text-xs font-medium">{guestName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
