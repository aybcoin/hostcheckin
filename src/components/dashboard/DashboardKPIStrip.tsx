/**
 * DashboardKPIStrip — Mercury/Stripe-style monochrome KPI tiles.
 * Single hairline border, generous numbers, subtle status footer.
 */
import { ArrowUpRight, BadgeCheck, Calendar, FileSignature, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  displayTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';

interface KPICardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  statusText?: string;
  statusVariant?: 'success' | 'warning' | 'muted';
  ctaLabel?: string;
  onClick?: () => void;
}

function KPICard({ label, value, icon: Icon, statusText, statusVariant = 'muted', ctaLabel, onClick }: KPICardProps) {
  const dotColor =
    statusVariant === 'success' ? 'bg-emerald-500'
    : statusVariant === 'warning' ? 'bg-amber-500'
    : 'bg-stone-300';

  const statusColor =
    statusVariant === 'success' ? 'text-emerald-700'
    : statusVariant === 'warning' ? 'text-amber-700'
    : textTokens.muted;

  const inner = (
    <div className="flex h-full flex-col justify-between gap-5">
      <div className="flex items-start justify-between gap-3">
        <p className={clsx('text-xs font-medium uppercase tracking-wider', textTokens.muted)}>
          {label}
        </p>
        <Icon size={16} strokeWidth={1.75} aria-hidden="true" className={textTokens.subtle} />
      </div>

      <div className="flex items-baseline gap-2">
        <span className={clsx('text-4xl leading-none', displayTokens.number, textTokens.title)}>
          {value}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        {statusText ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className={clsx('h-1.5 w-1.5 rounded-full', dotColor)} />
            <span className={clsx('text-xs font-medium', statusColor)}>{statusText}</span>
          </span>
        ) : <span aria-hidden="true" />}
        {ctaLabel ? (
          <span className={clsx('inline-flex items-center gap-1 text-xs font-medium', textTokens.muted)}>
            {ctaLabel}
            <ArrowUpRight size={12} strokeWidth={2} aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </div>
  );

  const baseClasses = clsx(
    'flex flex-col rounded-xl border p-5 transition-colors duration-150',
    surfaceTokens.panel,
    borderTokens.default,
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={clsx(baseClasses, 'text-left hover:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2')}
      >
        {inner}
      </button>
    );
  }

  return <div className={baseClasses}>{inner}</div>;
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
        statusText={signaturesStatus}
        statusVariant="success"
        onClick={onNavigateToContracts}
      />
      <KPICard
        label="Pièces d'identité"
        value={identities}
        icon={BadgeCheck}
        statusText={identitiesStatus}
        statusVariant="success"
        onClick={onNavigateToCheckins}
      />
      <KPICard
        label="Cautions sécurisées"
        value={deposits}
        icon={ShieldCheck}
        statusText={depositsStatus}
        statusVariant={depositsVariant}
      />
      <KPICard
        label="Réservations actives"
        value={activeReservations}
        icon={Calendar}
        ctaLabel="Ce mois"
        onClick={onNavigateToReservations}
      />
    </div>
  );
}
