import {
  ArrowRight,
  BadgeCheck,
  Calendar,
  FileSignature,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { clsx } from '../lib/clsx';
import { borderTokens, textTokens } from '../lib/design-tokens';
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
import { DataBoundary } from './ui/DataBoundary';
import { Card } from './ui/Card';
import { KpiCard } from './ui/KpiCard';
import { Skeleton } from './ui/Skeleton';
import { StatusBadge } from './ui/StatusBadge';

interface DashboardPageProps {
  host: Host | null;
  hostId: string;
  properties: Property[];
  initialPropertyId?: string | null;
  onOpenReservation: (reservationId: string) => void;
  onSelectedPropertyIdChange?: (propertyId: string | null) => void;
  onNavigateToPortfolio: () => void;
  onNavigateToContracts: () => void;
  onNavigateToCheckins: () => void;
  onNavigateToReservations: () => void;
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

function KpiGridSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[1, 2, 3, 4].map((index) => (
        <Card key={index} variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton variant="text" className="h-3 w-24" />
              <Skeleton variant="text" className="h-8 w-16" />
            </div>
            <Skeleton variant="circle" className="h-8 w-8" />
          </div>
        </Card>
      ))}
    </section>
  );
}

function DashboardSectionsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <TodaySectionSkeleton />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <Card key={index} variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
            <Skeleton variant="text" className="h-4 w-32" />
            <Skeleton variant="text" className="h-8 w-16" />
            <Skeleton variant="text" className="h-4 w-full" />
          </Card>
        ))}
      </div>
      <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
        <WeekSectionSkeleton />
      </Card>
      <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
        <TimelineSkeleton />
      </Card>
    </div>
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
    return <StatusBadge variant="success">{fr.realtime.live}</StatusBadge>;
  }

  return <StatusBadge variant="warning">{fr.realtime.reconnecting}</StatusBadge>;
}

export function DashboardPage({
  host,
  hostId,
  properties,
  initialPropertyId = null,
  onOpenReservation,
  onSelectedPropertyIdChange,
  onNavigateToPortfolio,
  onNavigateToContracts,
  onNavigateToCheckins,
  onNavigateToReservations,
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
    activeReservationsThisMonth,
    isLoading,
    error,
    isRealtimeActive,
    isRealtimeReconnecting,
    refresh,
  } = useDashboardData(selectedPropertyId);
  const todayPreviewItems = todayItems.slice(0, 3);
  const hiddenTodayItems = Math.max(0, todayItems.length - todayPreviewItems.length);

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
        <PropertySelector
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onChange={handlePropertyChange}
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={clsx('text-3xl font-semibold', textTokens.title)}>{fr.dashboard.title}</h1>
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

        {isLoading ? (
          <KpiGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label={fr.dashboard.kpis.signatures}
              value={trustMetrics.signatures}
              icon={<FileSignature />}
              onClick={onNavigateToContracts}
              variant="accent"
            />
            <KpiCard
              label={fr.dashboard.kpis.identities}
              value={trustMetrics.identities}
              icon={<BadgeCheck />}
              onClick={onNavigateToCheckins}
            />
            <KpiCard
              label={fr.dashboard.kpis.deposits}
              value={trustMetrics.deposits}
              icon={<ShieldCheck />}
            />
            <KpiCard
              label={fr.dashboard.kpis.activeReservations}
              value={activeReservationsThisMonth}
              icon={<Calendar />}
              onClick={onNavigateToReservations}
            />
          </div>
        )}
      </header>

      <DataBoundary
        loading={isLoading}
        error={error}
        onRetry={refresh}
        errorDescription={error ?? fr.errors.dashboard}
        loadingFallback={<DashboardSectionsSkeleton />}
      >
        <div className="space-y-6">
          <TodaySection
            items={todayPreviewItems}
            onAction={handleAction}
            onViewAll={onNavigateToReservations}
            overflowCount={hiddenTodayItems}
          />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          </div>

          <WeekSection items={weekItems} onAction={handleAction} />
          <ActivityTimeline events={timeline} />
        </div>
      </DataBoundary>
    </div>
  );
}
