/**
 * DashboardOperationsCard — single card with 4 compact operation rows:
 * Ménage du jour · Maintenance urgente · Stock de linge · Synchronisation iCal
 * Matches the right column of the Payoneer-style dashboard mockup.
 */
import { ArrowRight, RefreshCw, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  dashboardToneTokens,
  displayTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';

type Tone = keyof typeof dashboardToneTokens;

interface OpsRowProps {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  metaLabel?: string;
  value: string | number;
  valueVariant?: 'normal' | 'warning' | 'danger' | 'success';
  subText?: string;
  onViewAll?: () => void;
}

function OpsRow({ icon: Icon, tone, label, metaLabel, value, valueVariant = 'normal', subText, onViewAll }: OpsRowProps) {
  const valueColor =
    valueVariant === 'warning' ? textTokens.warning
    : valueVariant === 'danger' ? textTokens.danger
    : valueVariant === 'success' ? textTokens.success
    : textTokens.title;

  return (
    <div className={clsx('flex items-start gap-3 py-4', borderTokens.subtle, 'border-b last:border-b-0')}>
      <span
        className={clsx(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          dashboardToneTokens[tone].tile,
        )}
      >
        <Icon size={18} aria-hidden="true" className={dashboardToneTokens[tone].icon} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={clsx('text-xs font-semibold uppercase tracking-wide', textTokens.subtle)}>{label}</p>
          {onViewAll && (
            <button
              type="button"
              onClick={onViewAll}
              className={clsx('shrink-0 inline-flex items-center gap-0.5 text-xs font-medium', textTokens.muted)}
            >
              Voir tout
              <ArrowRight size={11} aria-hidden="true" />
            </button>
          )}
        </div>
        {metaLabel && (
          <p className={clsx('mt-0.5 text-[10px] font-medium uppercase tracking-wider', textTokens.subtle)}>{metaLabel}</p>
        )}
        <p className={clsx('mt-1 text-2xl', displayTokens.number, valueColor)}>{value}</p>
        {subText && <p className={clsx('mt-0.5 text-xs', textTokens.muted)}>{subText}</p>}
      </div>
    </div>
  );
}

interface DashboardOperationsCardProps {
  housekeepingCount: number;
  housekeepingMeta?: string;
  maintenanceCount: number;
  maintenanceMeta?: string;
  linenStatus?: string;
  linenVariant?: 'normal' | 'warning' | 'danger' | 'success';
  syncStatus?: string;
  syncVariant?: 'normal' | 'warning' | 'danger' | 'success';
  onNavigateToHousekeeping?: () => void;
  onNavigateToMaintenance?: () => void;
  onNavigateToLinen?: () => void;
  onNavigateToIcal?: () => void;
}

export function DashboardOperationsCard({
  housekeepingCount,
  housekeepingMeta,
  maintenanceCount,
  maintenanceMeta,
  linenStatus = 'OK',
  linenVariant = 'success',
  syncStatus = 'OK',
  syncVariant = 'success',
  onNavigateToHousekeeping,
  onNavigateToMaintenance,
  onNavigateToLinen,
  onNavigateToIcal,
}: DashboardOperationsCardProps) {
  return (
    <div className={clsx('flex flex-col rounded-2xl border p-5', surfaceTokens.panel, borderTokens.default)}>
      <OpsRow
        icon={Sparkles}
        tone="violet"
        label="Ménage du jour"
        metaLabel={housekeepingMeta ?? "Aujourd'hui"}
        value={housekeepingCount}
        onViewAll={onNavigateToHousekeeping}
      />
      <OpsRow
        icon={Wrench}
        tone="rose"
        label="Maintenance urgente"
        metaLabel={maintenanceMeta ?? 'Urgents'}
        value={maintenanceCount}
        valueVariant={maintenanceCount > 0 ? 'danger' : 'normal'}
        onViewAll={onNavigateToMaintenance}
      />
      <OpsRow
        icon={ShieldCheck}
        tone="amber"
        label="Stock de linge"
        metaLabel={linenVariant === 'warning' || linenVariant === 'danger' ? 'Bas' : undefined}
        value={linenStatus}
        valueVariant={linenVariant}
        onViewAll={onNavigateToLinen}
      />
      <OpsRow
        icon={RefreshCw}
        tone="emerald"
        label="Synchronisation"
        value={syncStatus}
        valueVariant={syncVariant}
        subText="Toutes les plateformes à jour"
        onViewAll={onNavigateToIcal}
      />
    </div>
  );
}
