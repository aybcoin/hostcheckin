import { Star, TrendingUp, CheckCircle, Clock, CalendarDays } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { surfaceTokens, textTokens } from '../../lib/design-tokens';
import { Reservation } from '../../lib/supabase';
import { fr } from '../../lib/i18n/fr';
import { Card } from '../ui/Card';

interface CalendarStatsProps {
  reservations: Reservation[];
  currentMonth: Date;
}

export function CalendarStats({ reservations, currentMonth }: CalendarStatsProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthReservations = reservations.filter((r) => {
    const checkIn = new Date(r.check_in_date);
    const checkOut = new Date(r.check_out_date);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    return checkIn <= monthEnd && checkOut >= monthStart && r.status !== 'cancelled';
  });

  let occupiedNights = 0;
  monthReservations.forEach((r) => {
    const checkIn = new Date(r.check_in_date);
    const checkOut = new Date(r.check_out_date);
    const start = Math.max(checkIn.getTime(), new Date(year, month, 1).getTime());
    const end = Math.min(checkOut.getTime(), new Date(year, month + 1, 0).getTime());
    const nights = Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    occupiedNights += nights;
  });

  const occupancyRate = daysInMonth > 0 ? Math.round((occupiedNights / daysInMonth) * 100) : 0;

  const prevMonth = new Date(year, month - 1, 1);
  const prevMonthDays = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
  const prevMonthRes = reservations.filter((r) => {
    const ci = new Date(r.check_in_date);
    const co = new Date(r.check_out_date);
    return ci <= new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0) && co >= prevMonth && r.status !== 'cancelled';
  });
  let prevOccupied = 0;
  prevMonthRes.forEach((r) => {
    const ci = new Date(r.check_in_date);
    const co = new Date(r.check_out_date);
    const start = Math.max(ci.getTime(), prevMonth.getTime());
    const end = Math.min(co.getTime(), new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getTime());
    prevOccupied += Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  });
  const prevRate = prevMonthDays > 0 ? Math.round((prevOccupied / prevMonthDays) * 100) : 0;
  const rateChange = prevRate > 0 ? Math.round(((occupancyRate - prevRate) / prevRate) * 100) : occupancyRate > 0 ? 100 : 0;

  const verifiedCount = monthReservations.filter((r) => r.status === 'checked_in' || r.status === 'completed').length;
  const verificationRate = monthReservations.length > 0 ? Math.round((verifiedCount / monthReservations.length) * 100) : 0;

  const totalNights = monthReservations.reduce((sum, r) => {
    const ci = new Date(r.check_in_date);
    const co = new Date(r.check_out_date);
    return sum + Math.max(1, Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)));
  }, 0);
  const avgStay = monthReservations.length > 0 ? Math.round(totalNights / monthReservations.length) : 0;

  const today = new Date();
  const upcomingArrivals = monthReservations.filter((r) => new Date(r.check_in_date) >= today).length;

  const ratedRes = monthReservations.filter((r) => r.guest_rating && r.guest_rating > 0);
  const avgRating = ratedRes.length > 0 ? (ratedRes.reduce((s, r) => s + (r.guest_rating || 0), 0) / ratedRes.length).toFixed(1) : '-';

  const circleRadius = 36;
  const circumference = 2 * Math.PI * circleRadius;
  const dashOffset = circumference - (occupancyRate / 100) * circumference;

  return (
    <Card variant="default" padding="md" className="space-y-5">
      <h3 className={clsx('font-semibold text-sm', textTokens.title)}>{fr.calendar.fields.monthStats}</h3>

      <div className="flex flex-col items-center">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={circleRadius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
            <circle
              cx="40" cy="40" r={circleRadius} fill="none"
              stroke="#0f172a" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={clsx('text-xl font-bold', textTokens.title)}>{occupancyRate}%</span>
          </div>
        </div>
        <p className={clsx('text-sm font-medium mt-2', textTokens.body)}>{fr.calendar.fields.occupancyRate}</p>
        <p className={clsx('text-xs', textTokens.subtle)}>{occupiedNights} nuits / {daysInMonth}</p>
        {rateChange !== 0 && (
          <p className={clsx('text-xs font-medium mt-1', rateChange > 0 ? textTokens.success : textTokens.danger)}>
            {rateChange > 0 ? '↑' : '↓'} {Math.abs(rateChange)}% {fr.calendar.fields.versusLastMonth}
          </p>
        )}
      </div>

      <div className="space-y-3">
        <div className={clsx('flex items-center justify-between p-3 rounded-lg', surfaceTokens.subtle)}>
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className={textTokens.muted} />
            <span className={clsx('text-sm', textTokens.body)}>{fr.calendar.fields.bookings}</span>
          </div>
          <span className={clsx('font-bold', textTokens.title)}>{monthReservations.length}</span>
        </div>

        <div className={clsx('flex items-center justify-between p-3 rounded-lg', surfaceTokens.subtle)}>
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className={textTokens.success} />
            <span className={clsx('text-sm', textTokens.body)}>{fr.calendar.fields.verificationRate}</span>
          </div>
          <span className={clsx('font-bold', textTokens.title)}>{verificationRate}%</span>
        </div>

        <div className={clsx('flex items-center justify-between p-3 rounded-lg', surfaceTokens.subtle)}>
          <div className="flex items-center gap-2">
            <Clock size={16} className={textTokens.muted} />
            <span className={clsx('text-sm', textTokens.body)}>{fr.calendar.fields.averageStay}</span>
          </div>
          <span className={clsx('font-bold', textTokens.title)}>{avgStay} nuits</span>
        </div>

        <div className={clsx('flex items-center justify-between p-3 rounded-lg', surfaceTokens.subtle)}>
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className={textTokens.warning} />
            <span className={clsx('text-sm', textTokens.body)}>{fr.calendar.fields.upcomingArrivals}</span>
          </div>
          <span className={clsx('font-bold', textTokens.title)}>{upcomingArrivals}</span>
        </div>

        <div className={clsx('flex items-center justify-between p-3 rounded-lg', surfaceTokens.subtle)}>
          <div className="flex items-center gap-2">
            <Star size={16} className={textTokens.warning} />
            <span className={clsx('text-sm', textTokens.body)}>{fr.calendar.fields.averageRating}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={clsx('font-bold', textTokens.title)}>{avgRating}</span>
            {avgRating !== '-' && <Star size={12} className={clsx('fill-current', textTokens.warning)} />}
          </div>
        </div>
      </div>
    </Card>
  );
}
