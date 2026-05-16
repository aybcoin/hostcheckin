import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { clsx } from '../../lib/clsx';
import { computeReservationBlocksForRange, daysInMonth } from '../../lib/calendar-logic';
import {
  accentTokens,
  borderTokens,
  stateFillTokens,
  statusTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { Guest, Property, Reservation } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type Zoom = 'week' | 'month' | 'quarter';

interface CalendarViewProps {
  reservations: Reservation[];
  properties: Property[];
  guests: Record<string, Pick<Guest, 'full_name'>>;
  initialMonth?: Date;
  onSelectReservation: (reservation: Reservation) => void;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfIsoWeek(date: Date): Date {
  const utc = startOfUtcDay(date);
  const day = utc.getUTCDay() || 7;
  if (day !== 1) {
    utc.setUTCDate(utc.getUTCDate() - (day - 1));
  }
  return utc;
}

function startOfQuarter(date: Date): Date {
  const month = Math.floor(date.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(date.getUTCFullYear(), month, 1));
}

function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function quarterDayCount(date: Date): number {
  const month = Math.floor(date.getUTCMonth() / 3) * 3;
  return [0, 1, 2].reduce(
    (sum, offset) => sum + daysInMonth(date.getUTCFullYear(), month + offset),
    0,
  );
}

function formatRangeLabel(zoom: Zoom, anchor: Date): string {
  if (zoom === 'week') {
    const start = startOfIsoWeek(anchor);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const startLabel = start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    const endLabel = end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${startLabel} → ${endLabel}`;
  }
  if (zoom === 'quarter') {
    const start = startOfQuarter(anchor);
    const quarterIndex = Math.floor(start.getUTCMonth() / 3) + 1;
    return `T${quarterIndex} ${start.getUTCFullYear()}`;
  }
  return anchor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function rangeStart(zoom: Zoom, anchor: Date): Date {
  if (zoom === 'week') return startOfIsoWeek(anchor);
  if (zoom === 'quarter') return startOfQuarter(anchor);
  return startOfMonthUtc(anchor);
}

function rangeDayCount(zoom: Zoom, anchor: Date): number {
  if (zoom === 'week') return 7;
  if (zoom === 'quarter') return quarterDayCount(anchor);
  return daysInMonth(anchor.getUTCFullYear(), anchor.getUTCMonth());
}

function stepAnchor(zoom: Zoom, anchor: Date, direction: 1 | -1): Date {
  const next = new Date(anchor);
  if (zoom === 'week') {
    next.setUTCDate(next.getUTCDate() + 7 * direction);
  } else if (zoom === 'quarter') {
    next.setUTCMonth(next.getUTCMonth() + 3 * direction);
  } else {
    next.setUTCMonth(next.getUTCMonth() + direction);
  }
  return next;
}

function formatReservationRange(reservation: Reservation): string {
  const start = new Date(reservation.check_in_date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const end = new Date(reservation.check_out_date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `${start} → ${end}`;
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  upcoming: { label: 'À venir', tone: statusTokens.info },
  in_progress: { label: 'En cours', tone: statusTokens.success },
  completed: { label: 'Terminée', tone: statusTokens.neutral },
  cancelled: { label: 'Annulée', tone: statusTokens.danger },
  verified: { label: 'Vérifiée', tone: statusTokens.success },
  contract_signed: { label: 'Contrat signé', tone: statusTokens.info },
  pending: { label: 'En attente', tone: statusTokens.pending },
};

function statusMeta(status: string | null | undefined) {
  if (!status) return STATUS_LABELS.pending;
  return STATUS_LABELS[status] ?? { label: status, tone: statusTokens.neutral };
}

const ZOOM_LABEL: Record<Zoom, string> = {
  week: 'Semaine',
  month: 'Mois',
  quarter: 'Trimestre',
};

export function CalendarView({
  reservations,
  properties,
  guests,
  initialMonth = new Date(),
  onSelectReservation,
}: CalendarViewProps) {
  const [zoom, setZoom] = useState<Zoom>('month');
  const [anchor, setAnchor] = useState(() => startOfUtcDay(initialMonth));

  const start = useMemo(() => rangeStart(zoom, anchor), [zoom, anchor]);
  const dayCount = useMemo(() => rangeDayCount(zoom, anchor), [zoom, anchor]);
  const dayGridStyle = { gridTemplateColumns: `repeat(${dayCount}, minmax(36px, 1fr))` };
  const minWidth = zoom === 'week' ? 720 : zoom === 'quarter' ? 1600 : 960;

  const reservationsById = useMemo(
    () => new Map(reservations.map((reservation) => [reservation.id, reservation])),
    [reservations],
  );

  const blocks = useMemo(
    () => computeReservationBlocksForRange(reservations, start, dayCount),
    [reservations, start, dayCount],
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
    <Card variant="default" padding="md" className="space-y-4 overflow-visible">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={clsx('text-lg font-semibold capitalize', textTokens.title)}>
            {formatRangeLabel(zoom, anchor)}
          </h2>
          <p className={clsx('text-sm', textTokens.muted)}>{fr.reservations.calendar.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Niveau de zoom" className={clsx('inline-flex overflow-hidden rounded-lg border', borderTokens.default)}>
            {(['week', 'month', 'quarter'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setZoom(option)}
                aria-pressed={zoom === option}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  zoom === option
                    ? clsx(accentTokens.bg, textTokens.inverse)
                    : clsx(surfaceTokens.panel, textTokens.body, 'hover:bg-stone-50'),
                )}
              >
                {ZOOM_LABEL[option]}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            aria-label={fr.reservations.calendar.previousMonth}
            onClick={() => setAnchor((value) => stepAnchor(zoom, value, -1))}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label={fr.reservations.calendar.nextMonth}
            onClick={() => setAnchor((value) => stepAnchor(zoom, value, 1))}
          >
            <ChevronRight size={14} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAnchor(startOfUtcDay(new Date()))}
          >
            {fr.reservations.calendar.today}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="space-y-2" style={{ minWidth }}>
          <div className="grid grid-cols-[200px_minmax(0,1fr)] items-stretch gap-0">
            <div className={clsx('sticky left-0 z-10 border-r px-4 py-3', surfaceTokens.panel, borderTokens.default)}>
              <span className={clsx('text-xs font-semibold uppercase tracking-wide', textTokens.subtle)}>
                {fr.reservations.calendar.propertiesColumn}
              </span>
            </div>
            <div className="grid" style={dayGridStyle}>
              {Array.from({ length: dayCount }, (_, index) => {
                const cellDate = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
                const isToday = cellDate.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={index}
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
                      {cellDate.getUTCDate()}
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
                    const status = statusMeta(reservation.status);

                    const tooltipText = `${guestName}\n${formatReservationRange(reservation)}\nStatut : ${status.label}\nCliquez pour ouvrir le détail`;

                    return (
                      <button
                        key={block.reservationId}
                        type="button"
                        onClick={() => onSelectReservation(reservation)}
                        title={tooltipText}
                        aria-label={`Ouvrir la réservation de ${guestName}, ${formatReservationRange(reservation)}, statut ${status.label}`}
                        className={clsx(
                          'absolute top-2 flex h-12 items-center gap-1.5 overflow-hidden rounded-lg border-l-2 px-2 text-left shadow-sm transition-shadow hover:shadow-md',
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
                        <span
                          aria-hidden="true"
                          className={clsx(
                            'ml-auto hidden h-1.5 w-1.5 shrink-0 rounded-full sm:inline-block',
                            status.tone.includes('emerald') ? 'bg-emerald-500'
                              : status.tone.includes('amber') ? 'bg-amber-500'
                                : status.tone.includes('sky') ? 'bg-sky-500'
                                  : status.tone.includes('red') ? 'bg-red-500'
                                    : 'bg-stone-400',
                          )}
                        />
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
