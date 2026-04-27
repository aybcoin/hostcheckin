/**
 * DashboardKPIStrip — 4 pastel icon-tile KPI cards matching the Payoneer-style mockup.
 * Colors: violet (signatures) · sky (identities) · emerald (deposits) · rose (reservations)
 */
import { ArrowRight, BadgeCheck, Calendar, FileSignature, ShieldCheck } from 'lucide-react';
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

interface KPICardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: Tone;
  statusText?: string;
  statusVariant?: 'success' | 'warning' | 'muted';
  ctaLabel?: string;
  onClick?: () => void;
}

function KPICard({ label, value, icon: Icon, tone, statusText, statusVariant = 'muted', ctaLabel, onClick }: KPICardProps) {
  const statusColor =
    statusVariant === 'success' ? textTokens.success
    : statusVariant === 'warning' ? textTokens.warning
    : textTokens.subtle;

  const dotColor =
    statusVariant === 'success' ? 'bg-emerald-400'
    : statusVariant === 'warning' ? 'bg-amber-400'
    : 'bg-stone-300';

  const inner = (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={clsx('text-[11px] font-semibold uppercase tracking-wider', textTokens.subtle)}>
            {label}
          </p>
          <p className={clsx('mt-1.5 text-4xl', displayTokens.number, textTokens.title)}>
            {value}
          </p>
        </div>
        <span
          className={clsx(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
            dashboardToneTokens[tone].tile,
          )}
        >
          <Icon size={22} aria-hidden="true" className={dashboardToneTokens[tone].icon} />
        </span>
      </div>
      {(statusText || ctaLabel) && (
        <div className="flex items-center gap-1.5">
          {statusText ? (
            <>
              <span aria-hidden="true" className={clsx('h-2 w-2 rounded-full', dotColor)} />
              <span className={clsx('text-xs font-medium', statusColor)}>{statusText}</span>
            </>
          ) : ctaLabel ? (
            <span className={clsx('inline-flex items-center gap-1 text-xs font-medium', textTokens.muted)}>
              {ctaLabel}
              <ArrowRight size={12} aria-hidden="true" />
            </span>
          ) : null}
        </div>
      )}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'flex w-full flex-col rounded-2xl border p-6 text-left transition-shadow duration-200 hover:shadow-md',
          surfaceTokens.panel,
          borderTokens.default,
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className={clsx('flex flex-col rounded-2xl border p-6', surfaceTokens.panel, borderTokens.default)}>
      {inner}
    </div>
  );
}

interface DashboardKPIStripProps {
  signatures: number;
  identities: number;
  deposits: number;
  activeReservations: number;
  onNavigateToContracts?: () => void;
  onNavigateToCheckins?: () => void;
  onNavigateToReservations?: () => void;
  signaturesStatus?: string;
  identitiesStatus?: string;
  depositsStatus?: string;
  depositsVariant?: 'success' | 'warning' | 'muted';
}

export function DashboardKPIStrip({
  signatures,
  identities,
  deposits,
  activeReservations,
  onNavigateToContracts,
  onNavigateToCheckins,
  onNavigateToReservations,
  signaturesStatus,
  identitiesStatus,
  depositsStatus,
  depositsVariant = 'success',
}: DashboardKPIStripProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        label="Signatures vérifiées"
        value={signatures}
        icon={FileSignature}
        tone="violet"
        statusText={signaturesStatus}
        statusVariant="success"
        onClick={onNavigateToContracts}
      />
      <KPICard
        label="Pièces d'identité"
        value={identities}
        icon={BadgeCheck}
        tone="sky"
        statusText={identitiesStatus}
        statusVariant="success"
        onClick={onNavigateToCheckins}
      />
      <KPICard
        label="Cautions sécurisées"
        value={deposits}
        icon={ShieldCheck}
        tone="emerald"
        statusText={depositsStatus}
        statusVariant={depositsVariant}
      />
      <KPICard
        label="Réservations actives"
        value={activeReservations}
        icon={Calendar}
        tone="rose"
        ctaLabel="Ce mois"
        onClick={onNavigateToReservations}
      />
    </div>
  );
}
