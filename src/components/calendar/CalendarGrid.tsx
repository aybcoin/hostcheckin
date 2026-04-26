import { Reservation } from '../../lib/supabase';
import { clsx } from '../../lib/clsx';
import { borderTokens, statusTokens, surfaceTokens, textTokens } from '../../lib/design-tokens';
import { Card } from '../ui/Card';

interface CalendarGridProps {
  currentMonth: Date;
  reservations: Reservation[];
  guests: Record<string, { full_name: string }>;
  filter: string;
  onReservationClick: (reservation: Reservation) => void;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function getReservationColor(reservation: Reservation, date: Date): string {
  const checkIn = new Date(reservation.check_in_date);
  const checkOut = new Date(reservation.check_out_date);
  const isCheckIn = checkIn.toDateString() === date.toDateString();
  const isCheckOut = checkOut.toDateString() === date.toDateString();

  if (reservation.status === 'cancelled') return statusTokens.neutral;
  if (isCheckIn) return clsx(statusTokens.success, 'border-l-2');
  if (isCheckOut) return clsx(statusTokens.warning, 'border-l-2');
  return statusTokens.neutral;
}

export function CalendarGrid({ currentMonth, reservations, guests, filter, onReservationClick }: CalendarGridProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  const filteredReservations = reservations.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'confirmed') return r.status === 'checked_in' || r.status === 'completed';
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'checkin') {
      const ci = new Date(r.check_in_date);
      return ci.getMonth() === month && ci.getFullYear() === year;
    }
    if (filter === 'checkout') {
      const co = new Date(r.check_out_date);
      return co.getMonth() === month && co.getFullYear() === year;
    }
    if (filter === 'cancelled') return r.status === 'cancelled';
    return true;
  });

  const getReservationsForDay = (dayNum: number) => {
    const date = new Date(year, month, dayNum);
    return filteredReservations.filter((r) => {
      const checkIn = new Date(r.check_in_date);
      const checkOut = new Date(r.check_out_date);
      return date >= checkIn && date <= checkOut;
    });
  };

  const today = new Date();
  const isToday = (dayNum: number) =>
    today.getDate() === dayNum && today.getMonth() === month && today.getFullYear() === year;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card variant="default" padding="sm" className="overflow-hidden p-0">
      <div className="grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div key={d} className={clsx('p-2 text-center text-xs font-semibold border-b', textTokens.subtle, surfaceTokens.subtle, borderTokens.default)}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((dayNum, idx) => {
          if (dayNum === null) {
            return <div key={`empty-${idx}`} className={clsx('min-h-[100px] border-b border-r', borderTokens.subtle, surfaceTokens.subtle)} />;
          }
          const dayReservations = getReservationsForDay(dayNum);
          const dayDate = new Date(year, month, dayNum);
          return (
            <div
              key={dayNum}
              className={clsx('min-h-[100px] border-b border-r p-1.5', borderTokens.subtle, isToday(dayNum) && surfaceTokens.muted)}
            >
              <div className={clsx(
                'text-xs font-medium mb-1',
                isToday(dayNum)
                  ? clsx('w-6 h-6 rounded-full flex items-center justify-center bg-current text-white', textTokens.title)
                  : clsx('pl-1', textTokens.muted),
              )}>
                {dayNum}
              </div>
              <div className="space-y-0.5">
                {dayReservations.slice(0, 3).map((r) => {
                  const guest = r.guest_id ? guests[r.guest_id] : undefined;
                  const name = guest?.full_name?.split(' ')[0] || 'Voyageur';
                  return (
                    <button
                      key={r.id}
                      onClick={() => onReservationClick(r)}
                      className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate transition-opacity hover:opacity-80 ${getReservationColor(r, dayDate)}`}
                    >
                      {name}
                    </button>
                  );
                })}
                {dayReservations.length > 3 && (
                  <span className={clsx('text-[10px] pl-1', textTokens.subtle)}>+{dayReservations.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
