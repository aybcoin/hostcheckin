import { Reservation } from '../../lib/supabase';
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

  if (reservation.status === 'cancelled') return 'bg-gray-200 text-gray-600';
  if (isCheckIn) return 'bg-emerald-100 text-emerald-800 border-l-2 border-emerald-600';
  if (isCheckOut) return 'bg-rose-100 text-rose-800 border-l-2 border-rose-500';
  return 'bg-slate-100 text-slate-800';
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
          <div key={d} className="p-2 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((dayNum, idx) => {
          if (dayNum === null) {
            return <div key={`empty-${idx}`} className="min-h-[100px] border-b border-r border-gray-100 bg-gray-50/30" />;
          }
          const dayReservations = getReservationsForDay(dayNum);
          const dayDate = new Date(year, month, dayNum);
          return (
            <div
              key={dayNum}
              className={`min-h-[100px] border-b border-r border-gray-100 p-1.5 ${
                isToday(dayNum) ? 'bg-slate-100/70' : ''
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${
                isToday(dayNum)
                  ? 'w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center'
                  : 'text-gray-600 pl-1'
              }`}>
                {dayNum}
              </div>
              <div className="space-y-0.5">
                {dayReservations.slice(0, 3).map((r) => {
                  const guest = guests[r.guest_id];
                  const name = guest?.full_name?.split(' ')[0] || 'Invité';
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
                  <span className="text-[10px] text-gray-400 pl-1">+{dayReservations.length - 3}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
