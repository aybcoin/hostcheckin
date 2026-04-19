import { useMemo } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowRight, ArrowUpRight, Info } from 'lucide-react';
import { Host, Property, Reservation } from '../lib/supabase';
import { useDashboardSignals, type DashboardReservationContext } from '../hooks/useDashboardSignals';
import { fr } from '../lib/i18n/fr';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Skeleton } from './ui/Skeleton';
import { ReservationContextCard, type ReservationIssueCode } from './dashboard/ReservationContextCard';

interface DashboardProps {
  host: Host | null;
  properties: Property[];
  reservations: Reservation[];
  loading: boolean;
  onOpenReservation: (reservationId: string) => void;
}

interface ActionItem {
  reservationId: string;
  guestName: string;
  propertyName: string;
  checkInDateLabel: string;
  checkInDateTs: number;
  statusLabel: string;
  issueCode: ReservationIssueCode;
  issueLabel: string;
  ctaLabel: string;
  onCta: () => void;
}

interface IndicatorCard {
  id: 'checkin_rate' | 'registers' | 'contracts';
  label: string;
  value: string;
  trend: number;
  hint: string;
}

/**
 * Priorisation métier zone "À traiter maintenant":
 * 1) Check-in non complété à J-1 ou moins (urgence opérationnelle).
 * 2) ID non vérifiée proche d'arrivée (risque conformité).
 * 3) Contrat non signé proche d'arrivée (risque juridique).
 * 4) Dépôt non versé (signal détecté via notes).
 */
export function Dashboard({
  host,
  properties,
  reservations,
  loading,
  onOpenReservation,
}: DashboardProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const {
    loading: signalsLoading,
    error: signalsError,
    reservationsContext,
    revalidate,
  } = useDashboardSignals({ reservations, properties });

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const parseDay = (value: string) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const dayDiff = (target: Date) => {
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.floor((target.getTime() - today.getTime()) / dayMs);
  };

  const formatArrival = (dateValue: string) => {
    const date = new Date(dateValue);
    return date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const statusLabel = (status: Reservation['status']) => {
    if (status === 'checked_in') return fr.reservations.statusCheckedIn;
    if (status === 'completed') return fr.reservations.statusCompleted;
    if (status === 'cancelled') return fr.reservations.statusCancelled;
    return fr.reservations.statusPending;
  };

  const actionItems = useMemo<ActionItem[]>(() => {
    const priorities: ReservationIssueCode[] = ['checkin_due', 'id_missing', 'contract_missing', 'deposit_pending'];

    const issueByContext = (context: DashboardReservationContext): ReservationIssueCode | null => {
      const checkInDate = parseDay(context.reservation.check_in_date);
      const daysUntilArrival = dayDiff(checkInDate);
      const isCheckinCompleted = context.reservation.status === 'checked_in' || context.reservation.status === 'completed';

      if (!isCheckinCompleted && daysUntilArrival <= 1) return 'checkin_due';
      if (daysUntilArrival <= 2 && context.verification.status !== 'approved') return 'id_missing';
      if (daysUntilArrival <= 2 && !context.contract.signed) return 'contract_missing';
      if (daysUntilArrival <= 2 && context.hasPendingDeposit) return 'deposit_pending';
      return null;
    };

    const issueLabel = (issue: ReservationIssueCode) => {
      if (issue === 'checkin_due') return fr.dashboard.zoneNow.issueCheckinDue;
      if (issue === 'id_missing') return fr.dashboard.zoneNow.issueIdMissing;
      if (issue === 'contract_missing') return fr.dashboard.zoneNow.issueContractMissing;
      return fr.dashboard.zoneNow.issueDepositPending;
    };

    return reservationsContext
      .map((context) => {
        const issue = issueByContext(context);
        if (!issue) return null;

        const ctaLabel = issue === 'checkin_due' ? fr.dashboard.zoneNow.ctaOpenFile : fr.dashboard.zoneNow.ctaFollowUp;
        const onCta = () => onOpenReservation(context.reservation.id);

        return {
          reservationId: context.reservation.id,
          guestName: context.guestName,
          propertyName: context.propertyName,
          checkInDateLabel: `${fr.dashboard.common.arrivalLabel}: ${formatArrival(context.reservation.check_in_date)}`,
          checkInDateTs: new Date(context.reservation.check_in_date).getTime(),
          statusLabel: statusLabel(context.reservation.status),
          issueCode: issue,
          issueLabel: issueLabel(issue),
          ctaLabel,
          onCta,
        } as ActionItem;
      })
      .filter((item): item is ActionItem => item !== null)
      .sort((left, right) => {
        const leftPriority = priorities.indexOf(left.issueCode);
        const rightPriority = priorities.indexOf(right.issueCode);
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return left.checkInDateTs - right.checkInDateTs;
      });
  }, [onOpenReservation, reservationsContext, today]);

  const upcomingArrivals = useMemo(() => {
    return reservationsContext
      .filter((context) => {
        const date = parseDay(context.reservation.check_in_date);
        const days = dayDiff(date);
        return days >= 0 && days <= 7 && context.reservation.status !== 'cancelled';
      })
      .sort((left, right) => new Date(left.reservation.check_in_date).getTime() - new Date(right.reservation.check_in_date).getTime());
  }, [reservationsContext, today]);

  const healthIndicators = useMemo<IndicatorCard[]>(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentWindowStart = new Date(today);
    currentWindowStart.setDate(today.getDate() - 29);
    const previousWindowStart = new Date(today);
    previousWindowStart.setDate(today.getDate() - 59);
    const previousWindowEnd = new Date(today);
    previousWindowEnd.setDate(today.getDate() - 30);

    const isWithin = (value: Date, start: Date, end: Date) => value >= start && value <= end;

    const currentPeriod = reservationsContext.filter((context) => {
      const checkIn = parseDay(context.reservation.check_in_date);
      return isWithin(checkIn, currentWindowStart, today);
    });
    const previousPeriod = reservationsContext.filter((context) => {
      const checkIn = parseDay(context.reservation.check_in_date);
      return isWithin(checkIn, previousWindowStart, previousWindowEnd);
    });

    const currentCheckinDone = currentPeriod.filter((context) =>
      context.reservation.status === 'checked_in' || context.reservation.status === 'completed').length;
    const previousCheckinDone = previousPeriod.filter((context) =>
      context.reservation.status === 'checked_in' || context.reservation.status === 'completed').length;

    const currentRate = currentPeriod.length > 0 ? Math.round((currentCheckinDone / currentPeriod.length) * 100) : 0;
    const previousRate = previousPeriod.length > 0 ? Math.round((previousCheckinDone / previousPeriod.length) * 100) : 0;

    const currentRegisters = reservationsContext.filter((context) => {
      if (context.verification.status !== 'approved' || !context.verification.at) return false;
      const verificationDate = new Date(context.verification.at);
      return isWithin(verificationDate, currentWindowStart, now);
    }).length;

    const previousRegisters = reservationsContext.filter((context) => {
      if (context.verification.status !== 'approved' || !context.verification.at) return false;
      const verificationDate = new Date(context.verification.at);
      return isWithin(verificationDate, previousWindowStart, previousWindowEnd);
    }).length;

    const currentContracts = reservationsContext.filter((context) => {
      if (!context.contract.signed || !context.contract.at) return false;
      const signedAt = new Date(context.contract.at);
      return signedAt >= currentMonthStart && signedAt <= now;
    }).length;

    const previousContracts = reservationsContext.filter((context) => {
      if (!context.contract.signed || !context.contract.at) return false;
      const signedAt = new Date(context.contract.at);
      return signedAt >= previousMonthStart && signedAt < currentMonthStart;
    }).length;

    return [
      {
        id: 'checkin_rate',
        label: fr.dashboard.zoneHealth.indicatorCheckinRate,
        value: `${currentRate}%`,
        trend: currentRate - previousRate,
        hint: fr.dashboard.zoneHealth.indicatorCheckinRateHint,
      },
      {
        id: 'registers',
        label: fr.dashboard.zoneHealth.indicatorRegisters,
        value: String(currentRegisters),
        trend: currentRegisters - previousRegisters,
        hint: fr.dashboard.zoneHealth.indicatorRegistersHint,
      },
      {
        id: 'contracts',
        label: fr.dashboard.zoneHealth.indicatorContractsMonth,
        value: String(currentContracts),
        trend: currentContracts - previousContracts,
        hint: fr.dashboard.zoneHealth.indicatorContractsMonthHint,
      },
    ];
  }, [reservationsContext, today]);

  return (
    <div className="space-y-6 lg:space-y-7">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{fr.dashboard.title}</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-slate-600">
          {fr.dashboard.subtitle(host?.full_name || fr.app.hostFallbackName)}
        </p>
      </header>

      <Card className="overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{fr.dashboard.zoneNow.title}</h2>
            <p className="text-sm text-slate-600">{fr.dashboard.zoneNow.subtitle}</p>
          </div>
          <span className="inline-flex self-start items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 sm:self-auto">
            <AlertTriangle size={12} />
            {fr.dashboard.zoneNow.actionsCount(actionItems.length)}
          </span>
        </div>

        {signalsLoading ? (
          <div className="mt-4 space-y-3 border-t border-slate-200/70 pt-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : signalsError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>{signalsError}</p>
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => void revalidate()}>
              {fr.common.retry}
            </Button>
          </div>
        ) : actionItems.length === 0 ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-800">{fr.dashboard.zoneNow.emptyTitle}</p>
            <p className="mt-1 text-sm text-slate-600">{fr.dashboard.zoneNow.emptySubtitle}</p>
          </div>
        ) : (
          <ul role="list" className="mt-4 space-y-3 border-t border-slate-200/70 pt-4">
            {actionItems.map((item, index) => (
              <li key={item.reservationId}>
                <ReservationContextCard
                  mode="action"
                  guestName={item.guestName}
                  propertyName={item.propertyName}
                  checkInDateLabel={item.checkInDateLabel}
                  statusLabel={item.statusLabel}
                  issueCode={item.issueCode}
                  issueLabel={item.issueLabel}
                  ctaLabel={item.ctaLabel}
                  ctaVariant={index === 0 ? 'primary' : 'secondary'}
                  onCta={item.onCta}
                  ctaTestId={`dashboard-now-cta-${item.reservationId}`}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="overflow-hidden p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{fr.dashboard.zoneUpcoming.title}</h2>
          <p className="text-sm text-slate-600">{fr.dashboard.zoneUpcoming.subtitle}</p>
        </div>
        {signalsLoading ? (
          <div className="mt-4 space-y-3 border-t border-slate-200/70 pt-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : upcomingArrivals.length === 0 ? (
          <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {fr.dashboard.zoneUpcoming.empty}
          </p>
        ) : (
          <ol role="list" className="relative mt-4 space-y-3 border-t border-slate-200/70 pt-4 pl-3 sm:pl-4">
            {upcomingArrivals.map((context, index) => (
              <li key={context.reservation.id} className="relative min-w-0">
                <span className="absolute -left-3 top-6 h-full w-px bg-slate-200 sm:-left-4" aria-hidden={index === upcomingArrivals.length - 1} />
                <span className="absolute -left-[13px] top-6 h-2 w-2 rounded-full bg-slate-900 sm:-left-[18px]" />
                <ReservationContextCard
                  mode="arrival"
                  guestName={context.guestName}
                  propertyName={context.propertyName}
                  checkInDateLabel={`${fr.dashboard.common.arrivalLabel}: ${formatArrival(context.reservation.check_in_date)}`}
                  statusLabel={statusLabel(context.reservation.status)}
                />
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card className="overflow-hidden p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{fr.dashboard.zoneHealth.title}</h2>
          <p className="text-sm text-slate-600">{fr.dashboard.zoneHealth.subtitle}</p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200/70 pt-4 md:grid-cols-3">
          {healthIndicators.map((indicator) => {
            const trendIcon = indicator.trend > 0 ? ArrowUpRight : indicator.trend < 0 ? ArrowDownRight : ArrowRight;
            const TrendIcon = trendIcon;
            const trendLabel = indicator.trend > 0
              ? fr.dashboard.zoneHealth.trendUp(indicator.trend)
              : indicator.trend < 0
                ? fr.dashboard.zoneHealth.trendDown(Math.abs(indicator.trend))
                : fr.dashboard.zoneHealth.trendFlat;

            return (
              <div key={indicator.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-slate-600">{indicator.label}</p>
                  <span title={indicator.hint} className="text-slate-400" aria-label={fr.dashboard.zoneHealth.tooltipAria}>
                    <Info size={14} />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{indicator.value}</p>
                <p className={`mt-1 inline-flex items-center gap-1 text-xs leading-4 ${indicator.trend > 0 ? 'text-emerald-700' : indicator.trend < 0 ? 'text-rose-700' : 'text-slate-600'}`}>
                  <TrendIcon size={12} />
                  <span>{trendLabel}</span>
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
