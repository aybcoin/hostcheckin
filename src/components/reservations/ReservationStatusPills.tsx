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

interface PillProps {
  step: ReservationStep;
}

// ── Config visuelle par statut ─────────────────────────────────────────────────

const STEP_VISUAL: Record<
  StepStatus,
  { bg: string; text: string; border: string; icon: typeof Check }
> = {
  ok: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: Check,
  },
  pending: {
    bg: 'bg-slate-50',
    text: 'text-slate-500',
    border: 'border-slate-200',
    icon: Clock,
  },
  blocking: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
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
      <span
        role="status"
        aria-label={step.label}
        className={`
          inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium
          ${visual.bg} ${visual.text} ${visual.border}
          cursor-default select-none
        `}
      >
        <Icon size={11} aria-hidden="true" />
        <span>{step.shortLabel}</span>
      </span>

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
