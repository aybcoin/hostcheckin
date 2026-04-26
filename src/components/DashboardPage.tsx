import { AlertCircle, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clsx } from '../lib/clsx';
import { borderTokens, stateFillTokens, surfaceTokens, textTokens } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import type { Host, Property } from '../lib/supabase';
import { useDashboardData } from '../hooks/useDashboardData';
import { ActivityTimeline } from './dashboard/ActivityTimeline';
import { FinanceSnapshotCard } from './dashboard/FinanceSnapshotCard';
import { HousekeepingTodayCard } from './dashboard/HousekeepingTodayCard';
import { IcalSyncCard } from './dashboard/IcalSyncCard';
import { InventoryLowStockCard } from './dashboard/InventoryLowStockCard';
import { LinenLowStockCard } from './dashboard/LinenLowStockCard';
import { MaintenanceUrgentCard } from './dashboard/MaintenanceUrgentCard';
import { MessagingHealthCard } from './dashboard/MessagingHealthCard';
import { AnalyticsSnapshotCard } from './dashboard/AnalyticsSnapshotCard';
import { PricingHealthCard } from './dashboard/PricingHealthCard';
import { TodaySection } from './dashboard/TodaySection';
import { WeekSection } from './dashboard/WeekSection';
import { PropertySelector } from './properties/PropertySelector';
import { TrustBar } from './trust/TrustBar';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';

interface DashboardPageProps {
  host: Host | null;
  hostId: string;
  properties: Property[];
  initialPropertyId?: string | null;
  onOpenReservation: (reservationId: string) => void;
  onSelectedPropertyIdChange?: (propertyId: string | null) => void;
  onNavigateToPortfolio: () => void;
  onNavigateToHousekeeping: () => void;
  onNavigateToMaintenance: () => void;
  onNavigateToLinen: () => void;
  onNavigateToFinance: () => void;
  onNavigateToIcal: () => void;
  onNavigateToInventory: () => void;
  onNavigateToPricing: () => void;
  onNavigateToMessaging: () => void;
  onNavigateToAnalytics?: () => void;
}

function TodaySectionSkeleton() {
  return (
    <section className="space-y-3" aria-hidden="true">
      {[1, 2, 3].map((index) => (
        <Skeleton
          key={index}
          variant="rect"
          className={clsx('h-20 w-full rounded-lg', borderTokens.subtle)}
        />
      ))}
    </section>
  );
}

function WeekSectionSkeleton() {
  return (
    <section className="space-y-2" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((index) => (
        <Skeleton key={index} variant="text" className="h-4 w-full" />
      ))}
    </section>
  );
}

function TimelineSkeleton() {
  return (
    <section className="space-y-2" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((index) => (
        <div key={index} className={clsx('flex items-center gap-3 rounded-lg border p-3', borderTokens.subtle)}>
          <Skeleton variant="circle" className="h-8 w-8" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-4 w-2/3" />
            <Skeleton variant="text" className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </section>
  );
}

function TrustBarSkeleton() {
  return (
    <section
      aria-hidden="true"
      className={clsx('flex w-full gap-2 rounded-xl border p-2', surfaceTokens.panel, borderTokens.subtle)}
    >
      {[1, 2, 3].map((index) => (
        <Skeleton key={index} variant="rect" className="h-10 flex-1 rounded-lg" />
      ))}
    </section>
  );
}

function LiveBadge({
  isRealtimeActive,
  isRealtimeReconnecting,
}: {
  isRealtimeActive: boolean;
  isRealtimeReconnecting: boolean;
}) {
  if (!isRealtimeActive && !isRealtimeReconnecting) {
    return null;
  }

  if (isRealtimeActive) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium',
          borderTokens.success,
          textTokens.success,
          surfaceTokens.panel,
        )}
      >
        <span className={clsx('inline-flex h-2 w-2 rounded-full', stateFillTokens.success)} aria-hidden="true" />
        {fr.realtime.live} 🟢
      </span>
    );
  }

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium',
        borderTokens.warning,
        textTokens.warning,
        surfaceTokens.panel,
      )}
    >
      {fr.realtime.reconnecting}
    </span>
  );
}

export function DashboardPage({
  host,
  hostId,
  properties,
  initialPropertyId = null,
  onOpenReservation,
  onSelectedPropertyIdChange,
  onNavigateToPortfolio,
  onNavigateToHousekeeping,
  onNavigateToMaintenance,
  onNavigateToLinen,
  onNavigateToFinance,
  onNavigateToIcal,
  onNavigateToInventory,
  onNavigateToPricing,
  onNavigateToMessaging,
  onNavigateToAnalytics,
}: DashboardPageProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(initialPropertyId);
  const {
    todayItems,
    weekItems,
    timeline,
    trustMetrics,
    isLoading,
    error,
    isRealtimeActive,
    isRealtimeReconnecting,
    refresh,
  } = useDashboardData(selectedPropertyId);

  useEffect(() => {
    setSelectedPropertyId(initialPropertyId);
  }, [initialPropertyId]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    if (properties.some((property) => property.id === selectedPropertyId)) return;

    setSelectedPropertyId(null);
    onSelectedPropertyIdChange?.(null);
  }, [onSelectedPropertyIdChange, properties, selectedPropertyId]);

  const handleAction = (reservationId: string) => {
    onOpenReservation(reservationId);
  };

  const handlePropertyChange = (propertyId: string | null) => {
    setSelectedPropertyId(propertyId);
    onSelectedPropertyIdChange?.(propertyId);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        {isLoading ? <TrustBarSkeleton /> : <TrustBar metrics={trustMetrics} />}
        <PropertySelector
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onChange={handlePropertyChange}
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={clsx('font-display text-3xl font-medium tracking-tight sm:text-4xl', textTokens.title)}>{fr.dashboard.title}</h1>
            {properties.length > 1 ? (
              <button
                type="button"
                onClick={onNavigateToPortfolio}
                className={clsx('inline-flex items-center gap-1 text-sm font-medium', textTokens.muted)}
              >
                {fr.dashboard.viewPortfolio}
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            ) : null}
            <LiveBadge
              isRealtimeActive={isRealtimeActive}
              isRealtimeReconnecting={isRealtimeReconnecting}
            />
          </div>
          <p className={clsx('mt-1 text-sm sm:text-base', textTokens.muted)}>
            {fr.dashboard.subtitle(host?.full_name || fr.app.hostFallbackName)}
          </p>
        </div>
      </header>

      {isLoading ? (
        <>
          <TodaySectionSkeleton />
          <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default, surfaceTokens.panel)}>
            <WeekSectionSkeleton />
          </Card>
          <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default, surfaceTokens.panel)}>
            <TimelineSkeleton />
          </Card>
        </>
      ) : error ? (
        <EmptyState
          icon={<AlertCircle size={20} className={textTokens.warning} aria-hidden="true" />}
          title={fr.errors.dashboard}
          description={error}
          action={(
            <Button variant="secondary" onClick={refresh}>
              {fr.errors.retry}
            </Button>
          )}
        />
      ) : (
        <>
          <TodaySection items={todayItems} onAction={handleAction} />
          <HousekeepingTodayCard hostId={hostId} propertyId={selectedPropertyId} onSeeAll={onNavigateToHousekeeping} />
          <MaintenanceUrgentCard hostId={hostId} propertyId={selectedPropertyId} onSeeAll={onNavigateToMaintenance} />
          <LinenLowStockCard hostId={hostId} propertyId={selectedPropertyId} onSeeAll={onNavigateToLinen} />
          <FinanceSnapshotCard hostId={hostId} onSeeAll={onNavigateToFinance} />
          <IcalSyncCard hostId={hostId} onSeeAll={onNavigateToIcal} />
          <PricingHealthCard hostId={hostId} onSeeAll={onNavigateToPricing} />
          <MessagingHealthCard hostId={hostId} onSeeAll={onNavigateToMessaging} />
          {onNavigateToAnalytics ? (
            <AnalyticsSnapshotCard hostId={hostId} onSeeAll={onNavigateToAnalytics} />
          ) : null}
          <InventoryLowStockCard hostId={hostId} propertyId={selectedPropertyId} onSeeAll={onNavigateToInventory} />
          <WeekSection items={weekItems} onAction={handleAction} />
          <ActivityTimeline events={timeline} />
        </>
      )}
    </div>
  );
}
