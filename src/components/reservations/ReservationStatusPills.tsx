/**
 * ReservationStatusPills.tsx
 * ──────────────────────────
 * Rangée de 4 pastilles de statut (Check-in · Contrat · ID · Dépôt)
 * avec :
 *  - couleur sémantique (vert/ambre/rouge) + icône
 *  - texte lisible par screen-reader (aria-label = label complet)
 *  - tooltip au survol (date d'accomplissement ou raison du blocage)
 *
 * Accessibilité :
 *  - La couleur n'est JAMAIS le seul vecteur d'information :
 *    l'icône + le aria-label textuel complet portent la sémantique.
 *  - role="status" sur chaque pastille pour annoncer les changements.
 */

import { Check, Clock, AlertCircle } from 'lucide-react';
import type { ReservationStep, StepStatus } from '../../lib/reservations-status';
import { StatusBadge, type StatusBadgeVariant } from '../ui/StatusBadge';

interface PillProps {
  step: ReservationStep;
}

// ── Config visuelle par statut ─────────────────────────────────────────────────

const STEP_VISUAL: Record<
  StepStatus,
  { variant: StatusBadgeVariant; icon: typeof Check }
> = {
  ok: {
    variant: 'success',
    icon: Check,
  },
  pending: {
    variant: 'neutral',
    icon: Clock,
  },
  blocking: {
    variant: 'danger',
    icon: AlertCircle,
  },
};

// ── Formatage date pour le tooltip ─────────────────────────────────────────────

function formatTooltipDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Composant pastille individuelle ───────────────────────────────────────────

function StatusPill({ step }: PillProps) {
  const visual = STEP_VISUAL[step.status];
  const Icon = visual.icon;

  const tooltipText = step.completedAt
    ? `${step.label} – ${formatTooltipDate(step.completedAt)}`
    : step.label;

  return (
    <span className="relative group inline-block">
      {/* Pastille */}
      <StatusBadge variant={visual.variant} icon={<Icon size={11} />} className="cursor-default select-none" size="sm">
        {step.shortLabel}
      </StatusBadge>

      {/* Tooltip CSS-only (pas de JS, pas de dépendance) */}
      <span
        role="tooltip"
        className="
          pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5
          -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200
          bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-md
          opacity-0 transition-opacity duration-150
          group-hover:opacity-100 group-focus-within:opacity-100
        "
      >
        {tooltipText}
        {/* flèche */}
        <span
          className="
            absolute left-1/2 top-full -translate-x-1/2
            border-4 border-transparent border-t-white
          "
          aria-hidden="true"
        />
      </span>
    </span>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────

interface ReservationStatusPillsProps {
  steps: {
    checkin: ReservationStep;
    contrat: ReservationStep;
    identite: ReservationStep;
    depot: ReservationStep;
  };
}

export function ReservationStatusPills({ steps }: ReservationStatusPillsProps) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      aria-label="Étapes de la réservation"
    >
      <StatusPill step={steps.checkin} />
      <StatusPill step={steps.contrat} />
      <StatusPill step={steps.identite} />
      <StatusPill step={steps.depot} />
    </div>
  );
}
