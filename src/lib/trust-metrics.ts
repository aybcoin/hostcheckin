import type { Reservation } from './supabase';
import type { ContractSummary, VerificationSummary } from './reservations-status';

export interface TrustMetrics {
  signatures: number;
  identities: number;
  deposits: number;
  windowDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Feature flag "soft" pour la métrique caution.
 * Par défaut: désactivée tant que le module caution n'expose pas un schéma stable.
 * Les tests peuvent l'activer via `globalThis.__HC_TRUST_DEPOSITS_ENABLED__ = true`.
 */
function isDepositsMetricEnabled(): boolean {
  const globalFlag = (globalThis as { __HC_TRUST_DEPOSITS_ENABLED__?: boolean }).__HC_TRUST_DEPOSITS_ENABLED__;
  return globalFlag === true;
}

function toTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function isWithinWindow(timestamp: number | null, startMs: number, endMs: number): boolean {
  if (timestamp === null) return false;
  return timestamp >= startMs && timestamp <= endMs;
}

function isSignedContract(contract: ContractSummary): boolean {
  if (contract.signed_by_guest) return true;
  const dynamic = contract as unknown as Record<string, unknown>;
  return typeof dynamic.status === 'string' && dynamic.status.toLowerCase() === 'signed';
}

function contractSignedAt(contract: ContractSummary): number | null {
  const dynamic = contract as unknown as Record<string, unknown>;
  return (
    toTimestamp(contract.signed_at ?? null) ??
    toTimestamp(dynamic.signedAt) ??
    toTimestamp(dynamic.created_at) ??
    toTimestamp(dynamic.updated_at)
  );
}

function isIdentityVerified(verification: VerificationSummary): boolean {
  const status = verification.status.toLowerCase();
  return status === 'approved' || status === 'verified' || status === 'ok';
}

function verificationAt(verification: VerificationSummary): number | null {
  const dynamic = verification as unknown as Record<string, unknown>;
  return (
    toTimestamp(verification.verified_at ?? null) ??
    toTimestamp(dynamic.at) ??
    toTimestamp(dynamic.created_at) ??
    toTimestamp(dynamic.updated_at)
  );
}

function isDepositActive(reservation: Reservation): boolean {
  const row = reservation as unknown as Record<string, unknown>;
  const status = typeof row.deposit_status === 'string'
    ? row.deposit_status.toLowerCase()
    : typeof row.caution_status === 'string'
    ? row.caution_status.toLowerCase()
    : null;

  if (status && ['active', 'secured', 'paid', 'held', 'verified'].includes(status)) {
    return true;
  }

  return row.deposit_active === true
    || row.caution_active === true
    || row.deposit_secured === true
    || row.caution_secured === true;
}

function depositAt(reservation: Reservation): number | null {
  const row = reservation as unknown as Record<string, unknown>;
  return (
    toTimestamp(row.deposit_paid_at) ??
    toTimestamp(row.caution_paid_at) ??
    toTimestamp(row.deposit_secured_at) ??
    toTimestamp(row.caution_secured_at) ??
    toTimestamp(row.deposit_updated_at) ??
    toTimestamp(row.updated_at) ??
    toTimestamp(row.created_at)
  );
}

/**
 * Calcule les indicateurs de confiance sur une fenêtre glissante en jours.
 * Fenêtre: [now - windowDays, now] en UTC (comparaison epoch millisecondes).
 */
export function computeTrustMetrics(
  reservations: Reservation[],
  contracts: ContractSummary[],
  verifications: VerificationSummary[],
  windowDays: number = 30,
): TrustMetrics {
  const safeWindowDays = Number.isFinite(windowDays) && windowDays > 0
    ? Math.floor(windowDays)
    : 30;

  const endMs = Date.now();
  const startMs = endMs - safeWindowDays * DAY_MS;

  const signatures = contracts.reduce((count, contract) => {
    if (!isSignedContract(contract)) return count;
    if (!isWithinWindow(contractSignedAt(contract), startMs, endMs)) return count;
    return count + 1;
  }, 0);

  const identities = verifications.reduce((count, verification) => {
    if (!isIdentityVerified(verification)) return count;
    if (!isWithinWindow(verificationAt(verification), startMs, endMs)) return count;
    return count + 1;
  }, 0);

  const deposits = isDepositsMetricEnabled()
    ? reservations.reduce((count, reservation) => {
        if (!isDepositActive(reservation)) return count;
        if (!isWithinWindow(depositAt(reservation), startMs, endMs)) return count;
        return count + 1;
      }, 0)
    : 0;

  return {
    signatures,
    identities,
    deposits,
    windowDays: safeWindowDays,
  };
}
