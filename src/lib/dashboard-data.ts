import type { ContractSummary, VerificationSummary } from './reservations-status';
import type { Reservation } from './supabase';
import { fr } from './i18n/fr';

export interface TodayItem {
  id: string;
  type: 'arrival' | 'departure' | 'action';
  guestName: string;
  propertyName: string;
  time: string;
  ctaLabel?: string;
  ctaVariant?: 'primary' | 'danger' | 'subtle';
  urgency: 'critical' | 'high' | 'normal';
}

export interface WeekItem {
  id: string;
  guestName: string;
  propertyName: string;
  dayLabel: string;
  actionLabel: string;
  urgency: 'high' | 'normal';
}

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  message: string;
  type: 'signature' | 'identity' | 'deposit' | 'reservation' | 'checkin';
  icon: 'check' | 'alert' | 'lock' | 'plus';
}

type DecoratedReservation = Reservation & {
  guest_name?: string;
  property_name?: string;
  check_in_time?: string;
  check_out_time?: string;
  verification_status?: string;
  contract_signed?: boolean;
  has_pending_deposit?: boolean;
};

type DepositInput = {
  id?: string;
  status?: string;
  type?: string;
  event_type?: string;
  created_at?: string;
  updated_at?: string;
  secured_at?: string;
  paid_at?: string;
  at?: string;
  guestName?: string;
  propertyName?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function parseDateWithOptionalTime(dayValue: string, hhmm?: string): Date {
  if (hhmm && /^\d{2}:\d{2}$/.test(hhmm)) {
    const parsed = new Date(`${dayValue}T${hhmm}:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const fallback = new Date(dayValue);
  fallback.setHours(12, 0, 0, 0);
  return fallback;
}

function toTimeLabel(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function toTodayActionLabel(date: Date): string {
  return `aujourd'hui ${toTimeLabel(date)}`;
}

function getGuestName(reservation: DecoratedReservation): string {
  return reservation.guest_name || fr.app.guestFallbackName;
}

function getPropertyName(reservation: DecoratedReservation): string {
  return reservation.property_name || fr.dashboard.common.propertyFallback;
}

function getVerificationStatus(reservation: DecoratedReservation): string {
  return (reservation.verification_status || '').toLowerCase();
}

function isVerificationOk(status: string): boolean {
  return status === 'approved' || status === 'verified' || status === 'ok';
}

function hasContractSigned(reservation: DecoratedReservation): boolean {
  return reservation.contract_signed === true;
}

function getActionForReservation(
  reservation: DecoratedReservation,
  daysUntilArrival: number,
): {
  label: string;
  urgency: 'critical' | 'high' | 'normal';
  ctaVariant: 'primary' | 'danger' | 'subtle';
} | null {
  if (reservation.status === 'cancelled' || reservation.status === 'completed' || reservation.status === 'checked_out') {
    return null;
  }

  const verificationStatus = getVerificationStatus(reservation);
  const contractSigned = hasContractSigned(reservation);
  const hasPendingDeposit = reservation.has_pending_deposit === true;

  if (reservation.status === 'pending' && daysUntilArrival <= 0) {
      return {
      label: fr.dashboard.today.actionValidateCheckin,
      urgency: 'critical',
      ctaVariant: 'danger',
    };
  }

  if (!contractSigned && daysUntilArrival <= 3) {
      return {
      label: fr.dashboard.week.actionSignContract,
      urgency: 'high',
      ctaVariant: 'primary',
    };
  }

  if (!isVerificationOk(verificationStatus) && daysUntilArrival <= 3) {
      return {
      label: fr.dashboard.week.actionRequestIdentity,
      urgency: 'high',
      ctaVariant: 'primary',
    };
  }

  if (hasPendingDeposit && daysUntilArrival <= 7) {
      return {
      label: fr.dashboard.week.actionFinalizeDeposit,
      urgency: 'normal',
      ctaVariant: 'subtle',
    };
  }

  return null;
}

function urgencyWeight(urgency: 'critical' | 'high' | 'normal'): number {
  if (urgency === 'critical') return 0;
  if (urgency === 'high') return 1;
  return 2;
}

function formatWeekDayLabel(targetDate: Date, now: Date): string {
  const startNow = startOfDay(now).getTime();
  const startTarget = startOfDay(targetDate).getTime();
  const diffDays = Math.round((startTarget - startNow) / DAY_MS);
  if (diffDays === 1) return fr.dashboard.common.tomorrow;

  return targetDate
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
    .replace('.', '');
}

export function computeTodayItems(
  reservations: Reservation[],
  now: Date = new Date(),
): TodayItem[] {
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const withMeta: Array<TodayItem & { _sortDate: Date }> = [];

  reservations.forEach((row) => {
    const reservation = row as DecoratedReservation;
    const checkInDate = parseDate(reservation.check_in_date);
    const checkOutDate = parseDate(reservation.check_out_date);
    if (!checkInDate || !checkOutDate) return;

    const arrivalDateTime = parseDateWithOptionalTime(reservation.check_in_date, reservation.check_in_time);
    const departureDateTime = parseDateWithOptionalTime(reservation.check_out_date, reservation.check_out_time);

    const guestName = getGuestName(reservation);
    const propertyName = getPropertyName(reservation);

    if (checkInDate >= dayStart && checkInDate <= dayEnd) {
      withMeta.push({
        id: `${reservation.id}:arrival`,
        type: 'arrival',
        guestName,
        propertyName,
        time: toTimeLabel(arrivalDateTime),
        urgency: 'normal',
        _sortDate: arrivalDateTime,
      });
    }

    if (checkOutDate >= dayStart && checkOutDate <= dayEnd) {
      withMeta.push({
        id: `${reservation.id}:departure`,
        type: 'departure',
        guestName,
        propertyName,
        time: toTimeLabel(departureDateTime),
        urgency: 'normal',
        _sortDate: departureDateTime,
      });
    }

    const daysUntilArrival = Math.floor((startOfDay(checkInDate).getTime() - dayStart.getTime()) / DAY_MS);
    const action = getActionForReservation(reservation, daysUntilArrival);
    if (action && daysUntilArrival <= 0) {
      withMeta.push({
        id: `${reservation.id}:action`,
        type: 'action',
        guestName,
        propertyName,
        time: toTodayActionLabel(arrivalDateTime),
        ctaLabel: action.label,
        ctaVariant: action.ctaVariant,
        urgency: action.urgency,
        _sortDate: arrivalDateTime,
      });
    }
  });

  return withMeta
    .sort((left, right) => {
      const urgencyCmp = urgencyWeight(left.urgency) - urgencyWeight(right.urgency);
      if (urgencyCmp !== 0) return urgencyCmp;
      return left._sortDate.getTime() - right._sortDate.getTime();
    })
    .slice(0, 5)
    .map(({ _sortDate: _ignored, ...item }) => item);
}

export function computeWeekItems(
  reservations: Reservation[],
  now: Date = new Date(),
): WeekItem[] {
  const today = startOfDay(now);

  const items: Array<WeekItem & { _sortDate: Date }> = [];
  reservations.forEach((row) => {
    const reservation = row as DecoratedReservation;
    const checkInDate = parseDate(reservation.check_in_date);
    if (!checkInDate) return;
    const normalizedCheckIn = startOfDay(checkInDate);
    const daysUntilArrival = Math.floor((normalizedCheckIn.getTime() - today.getTime()) / DAY_MS);
    if (daysUntilArrival < 1 || daysUntilArrival > 7) return;

    const action = getActionForReservation(reservation, daysUntilArrival);
    if (!action) return;

    items.push({
      id: reservation.id,
      guestName: getGuestName(reservation),
      propertyName: getPropertyName(reservation),
      dayLabel: formatWeekDayLabel(checkInDate, now),
      actionLabel: action.label,
      urgency: action.urgency === 'normal' ? 'normal' : 'high',
      _sortDate: checkInDate,
    });
  });

  return items
    .sort((left, right) => {
      const urgencyCmp = urgencyWeight(left.urgency === 'high' ? 'high' : 'normal') - urgencyWeight(right.urgency === 'high' ? 'high' : 'normal');
      if (urgencyCmp !== 0) return urgencyCmp;
      return left._sortDate.getTime() - right._sortDate.getTime();
    })
    .map(({ _sortDate: _ignored, ...item }) => item);
}

function buildContractEvent(contract: ContractSummary): ActivityEvent | null {
  const contractRecord = contract as unknown as Record<string, unknown>;
  const signedViaStatus = typeof contractRecord.status === 'string'
    && contractRecord.status.toLowerCase() === 'signed';
  if (!(contract.signed_by_guest || signedViaStatus)) return null;

  const timestamp = parseDate(
    contract.signed_at
    || (contractRecord.signed_at as string | undefined)
    || (contractRecord.created_at as string | undefined)
    || (contractRecord.updated_at as string | undefined),
  );
  if (!timestamp) return null;

  const guestName = (contractRecord.guestName as string | undefined) || fr.dashboard.common.guestFallback;
  const propertyName = (contractRecord.propertyName as string | undefined) || fr.dashboard.common.propertyFallback;

  return {
    id: `contract:${String(contractRecord.id || timestamp.getTime())}`,
    timestamp,
    message: fr.dashboard.activity.signatureMessage(guestName, propertyName),
    type: 'signature',
    icon: 'check',
  };
}

function buildVerificationEvent(verification: VerificationSummary): ActivityEvent | null {
  const record = verification as unknown as Record<string, unknown>;
  const status = String(record.status ?? verification.status ?? '').toLowerCase();
  if (!['approved', 'verified', 'ok'].includes(status)) return null;

  const timestamp = parseDate(
    verification.verified_at
    || (record.verified_at as string | undefined)
    || (record.created_at as string | undefined)
    || (record.updated_at as string | undefined),
  );
  if (!timestamp) return null;

  const guestName = (record.guestName as string | undefined) || fr.dashboard.common.guestFallback;
  const propertyName = (record.propertyName as string | undefined) || fr.dashboard.common.propertyFallback;

  return {
    id: `identity:${String(record.id || timestamp.getTime())}`,
    timestamp,
    message: fr.dashboard.activity.identityMessage(guestName, propertyName),
    type: 'identity',
    icon: 'check',
  };
}

function buildAuxEvent(item: DepositInput): ActivityEvent | null {
  const type = String(item.event_type || item.type || '').toLowerCase();
  const timestamp = parseDate(item.at || item.secured_at || item.paid_at || item.updated_at || item.created_at);
  if (!timestamp) return null;

  const guestName = item.guestName || fr.dashboard.common.guestFallback;
  const propertyName = item.propertyName || fr.dashboard.common.propertyFallback;

  if (type === 'checkin') {
    return {
      id: `checkin:${item.id || timestamp.getTime()}`,
      timestamp,
      message: fr.dashboard.activity.checkinMessage(guestName, propertyName),
      type: 'checkin',
      icon: 'check',
    };
  }

  if (type === 'reservation') {
    return {
      id: `reservation:${item.id || timestamp.getTime()}`,
      timestamp,
      message: fr.dashboard.activity.reservationMessage(guestName, propertyName),
      type: 'reservation',
      icon: 'plus',
    };
  }

  const status = String(item.status || '').toLowerCase();
  const isDepositActive = ['active', 'secured', 'paid', 'held', 'verified'].includes(status);
  if (isDepositActive || type === 'deposit') {
    return {
      id: `deposit:${item.id || timestamp.getTime()}`,
      timestamp,
      message: fr.dashboard.activity.depositMessage(guestName, propertyName),
      type: 'deposit',
      icon: 'lock',
    };
  }

  return null;
}

export function computeActivityTimeline(
  contracts: ContractSummary[],
  verifications: VerificationSummary[],
  deposits: DepositInput[] = [],
  limit: number = 10,
): ActivityEvent[] {
  const events: ActivityEvent[] = [];
  contracts.forEach((contract) => {
    const event = buildContractEvent(contract);
    if (event) events.push(event);
  });

  verifications.forEach((verification) => {
    const event = buildVerificationEvent(verification);
    if (event) events.push(event);
  });

  deposits.forEach((item) => {
    const event = buildAuxEvent(item);
    if (event) events.push(event);
  });

  return events
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, Math.max(0, limit));
}
