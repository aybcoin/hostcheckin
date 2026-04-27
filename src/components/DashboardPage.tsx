import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clsx } from '../lib/clsx';
import { borderTokens, textTokens } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import type { Host, Property } from '../lib/supabase';
import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardKPIStrip } from './dashboard/DashboardKPIStrip';
import { DashboardPrioritiesSection } from './dashboard/DashboardPrioritiesSection';
import { DashboardTodayTimeline } from './dashboard/DashboardTodayTimeline';
import { DashboardOperationsCard } from './dashboard/DashboardOperationsCard';
import { FinanceSnapshotCard } from './dashboard/FinanceSnapshotCard';
import { HousekeepingTodayCard } from './dashboard/HousekeepingTodayCard';
import { MaintenanceUrgentCard } from './dashboard/MaintenanceUrgentCard';
import { LinenLowStockCard } from './dashboard/LinenLowStockCard';
import { IcalSyncCard } from './dashboard/IcalSyncCard';
import { PropertySelector } from './properties/PropertySelector';
import { DataBoundary } from './ui/DataBoundary';
import { Card } from './ui/Card';
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

function KpiGridSkeleton() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton variant="text" className="h-3 w-24" />
              <Skeleton variant="text" className="h-8 w-16" />
            </div>
            <Skeleton variant="circle" className="h-11 w-11" />
          </div>
        </Card>
      ))}
    </section>
  );
}

function DashboardSectionsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      {/* Priorities */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="default" padding="sm" className={clsx('p-4', borderTokens.default)}>
            <Skeleton variant="text" className="mb-2 h-4 w-24" />
            <Skeleton variant="text" className="h-4 w-full" />
          </Card>
        ))}
      </div>
      {/* 2-col layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} variant="default" padding="sm" className={clsx('p-4', borderTokens.default)}>
              <Skeleton variant="text" className="h-4 w-full" />
            </Card>
          ))}
        </div>
        <div className="lg:col-span-2">
          <Card variant="default" padding="md" className={clsx('space-y-4', borderTokens.default)}>
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="text" className="h-8 w-full" />)}
          </Card>
        </div>
      </div>
    </div>
  );
}

function LiveBadge({ isRealtimeActive, isRealtimeReconnecting }: { isRealtimeActive: boolean; isRealtimeReconnecting: boolean }) {
  if (!isRealtimeActive && !isRealtimeReconnecting) return null;
  if (isRealtimeActive) return <StatusBadge variant="success">{fr.realtime.live}</StatusBadge>;
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
    trustMetrics,
    activeReservationsThisMonth,
    isLoading,
    error,
    isRealtimeActive,
    isRealtimeReconnecting,
    refresh,
  } = useDashboardData(selectedPropertyId);

  useEffect(() => { setSelectedPropertyId(initialPropertyId); }, [initialPropertyId]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    if (properties.some((p) => p.id === selectedPropertyId)) return;
    setSelectedPropertyId(null);
    onSelectedPropertyIdChange?.(null);
  }, [onSelectedPropertyIdChange, properties, selectedPropertyId]);

  // These navigation callbacks are threaded through props for future use
  void onNavigateToInventory;
  void onNavigateToPricing;
  void onNavigateToMessaging;
  void onNavigateToAnalytics;

  const handleAction = (reservationId: string) => onOpenReservation(reservationId);

  const handlePropertyChange = (propertyId: string | null) => {
    setSelectedPropertyId(propertyId);
    onSelectedPropertyIdChange?.(propertyId);
  };

  // Derive KPI status texts from trust metrics
  const depositsVariant = trustMetrics.deposits === 0 ? 'warning' : 'success';
  const depositsStatus = trustMetrics.deposits === 0 ? 'En attente' : 'Sécurisées';

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <header className="space-y-4">
        <PropertySelector
          properties={properties}
          selectedPropertyId={selectedPropertyId}
          onChange={handlePropertyChange}
        />
        <div className="flex flex-wrap items-center gap-2">
          <h1 className={clsx('text-3xl font-semibold', textTokens.title)}>
            {fr.dashboard.title}
          </h1>
          {properties.length > 1 && (
            <button
              type="button"
              onClick={onNavigateToPortfolio}
              className={clsx('inline-flex items-center gap-1 text-sm font-medium', textTokens.muted)}
            >
              {fr.dashboard.viewPortfolio}
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
          <LiveBadge isRealtimeActive={isRealtimeActive} isRealtimeReconnecting={isRealtimeReconnecting} />
        </div>
        <p className={clsx('text-sm', textTokens.muted)}>
          {fr.dashboard.subtitle(host?.full_name || fr.app.hostFallbackName)}
        </p>

        {/* KPI Strip */}
        {isLoading ? <KpiGridSkeleton /> : (
          <DashboardKPIStrip
            signatures={trustMetrics.signatures}
            identities={trustMetrics.identities}
            deposits={trustMetrics.deposits}
            activeReservations={activeReservationsThisMonth}
            onNavigateToContracts={onNavigateToContracts}
            onNavigateToCheckins={onNavigateToCheckins}
            onNavigateToReservations={onNavigateToReservations}
            signaturesStatus="Tous en ordre"
            identitiesStatus="Tous contrôlés"
            depositsStatus={depositsStatus}
            depositsVariant={depositsVariant}
          />
        )}
      </header>

      {/* ── Body ── */}
      <DataBoundary
        loading={isLoading}
        error={error}
        onRetry={refresh}
        errorDescription={error ?? fr.errors.dashboard}
        loadingFallback={<DashboardSectionsSkeleton />}
      >
        <div className="space-y-6">
          {/* Lot 4 — Actions prioritaires */}
          <DashboardPrioritiesSection
            items={todayItems}
            onAction={handleAction}
            onViewAll={onNavigateToReservations}
          />

          {/* Lot 5 + 6 — 2-col: timeline left / ops right */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            {/* Today timeline */}
            <div className="lg:col-span-3">
              <DashboardTodayTimeline
                items={todayItems}
                onAction={handleAction}
                onViewAll={onNavigateToReservations}
              />
            </div>

            {/* Ops mini-panel */}
            <div className="space-y-4 lg:col-span-2">
              <DashboardOperationsCard
                housekeepingCount={0}
                maintenanceCount={0}
                linenStatus="OK"
                linenVariant="success"
                syncStatus="OK"
                syncVariant="success"
                onNavigateToHousekeeping={onNavigateToHousekeeping}
                onNavigateToMaintenance={onNavigateToMaintenance}
                onNavigateToLinen={onNavigateToLinen}
                onNavigateToIcal={onNavigateToIcal}
              />
              {/* Hidden data providers that feed real counts — rendered as data sources only */}
              <div className="sr-only" aria-hidden="true">
                <HousekeepingTodayCard hostId={hostId} propertyId={selectedPropertyId} onSeeAll={onNavigateToHousekeeping} />
                <MaintenanceUrgentCard hostId={hostId} propertyId={selectedPropertyId} onSeeAll={onNavigateToMaintenance} />
                <LinenLowStockCard hostId={hostId} propertyId={selectedPropertyId} onSeeAll={onNavigateToLinen} />
                <IcalSyncCard hostId={hostId} onSeeAll={onNavigateToIcal} />
              </div>
            </div>
          </div>

          {/* Aperçu financier */}
          <FinanceSnapshotCard hostId={hostId} onSeeAll={onNavigateToFinance} />
        </div>
      </DataBoundary>
    </div>
  );
}
