/**
 * ReservationCard.tsx
 * ───────────────────
 * Carte de réservation refondée avec :
 *  - En-tête lisible : dates, durée, voyageurs, logement
 *  - Rangée de pastilles de statut (Check-in / Contrat / ID / Dépôt)
 *  - Un seul CTA contextuel (action prioritaire)
 *  - Panel expansible avec le détail complet (préservé de l'ancienne version)
 *  - Accessibilité : role=button + aria-expanded + focus ring
 */

import { useState } from 'react';
import {
  Calendar, Copy, Check, ChevronDown, ChevronUp,
  Link2, Star, FileSearch, Share2, Trash2, Users, Shield, Lock, ClipboardList,
} from 'lucide-react';
import { Reservation, Property, APP_BASE_URL } from '../../lib/supabase';
import {
  ReservationSteps,
  ReservationCta,
  nightsCount,
} from '../../lib/reservations-status';
import { ReservationStatusPills } from './ReservationStatusPills';
import { TrustBadge } from '../trust/TrustBadge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { fr } from '../../lib/i18n/fr';
import { statusTokens, ctaTokens } from '../../lib/design-tokens';
import { SecurityNotice } from '../SecurityNotice';

// ── Types locaux ───────────────────────────────────────────────────────────────

export interface GuestInfo {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
}

export interface VerificationInfo {
  id: string;
  reservation_id: string;
  status: string;
  id_type: string;
  id_document_url: string;
  id_back_url?: string;
  selfie_url?: string;
  document_confidence?: number;
  detected_document_type?: string;
  rejection_reason?: string;
}

export interface ContractInfo {
  id: string;
  reservation_id: string;
  signed_by_guest: boolean;
  guest_signature_url?: string;
  contract_content?: string;
  pdf_storage_path?: string;
  signed_at?: string;
}

export interface ReservationCardProps {
  reservation: Reservation;
  property: Property | undefined;
  guest: GuestInfo | undefined;
  verification: VerificationInfo | undefined;
  contract: ContractInfo | undefined;
  steps: ReservationSteps;
  cta: ReservationCta;
  /** ID initialement déplié (depuis navigation externe). */
  initiallyExpanded?: boolean;
  onUpdate: (id: string, updates: Partial<Reservation>) => Promise<{ error: { message: string } | null }>;
  onDelete: (id: string) => Promise<void>;
  onBlacklist: (reservation: Reservation, guest: GuestInfo | undefined) => Promise<void>;
  onOpenDocuments: (id: string, ref: string) => void;
  onOpenShare: (link: string, guestName: string, propertyName: string) => void;
  onOpenRating: (id: string, ref: string, rating?: number) => void;
}

// ── Utilitaires ────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:    { label: fr.reservations.statusPending,   cls: statusTokens.pending },
  checked_in: { label: fr.reservations.statusCheckedIn, cls: statusTokens.success },
  completed:  { label: fr.reservations.statusCompleted, cls: statusTokens.neutral },
  cancelled:  { label: fr.reservations.statusCancelled, cls: statusTokens.danger },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
}

function isIdentityTrusted(status?: string): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === 'approved' || normalized === 'verified' || normalized === 'ok';
}

// ── Composant ──────────────────────────────────────────────────────────────────

export function ReservationCard({
  reservation,
  property,
  guest,
  verification,
  contract,
  steps,
  cta,
  initiallyExpanded = false,
  onUpdate,
  onDelete,
  onBlacklist,
  onOpenDocuments,
  onOpenShare,
  onOpenRating,
}: ReservationCardProps) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [copied, setCopied] = useState(false);

  const checkinLink = `${APP_BASE_URL}/checkin/${reservation.unique_link}`;
  const propertyName = property?.name ?? fr.reservations.unknownProperty;
  const nights = nightsCount(reservation.check_in_date, reservation.check_out_date);
  const verMode =
    reservation.verification_mode ?? reservation.verification_type ?? 'simple';
  const statusBadge = STATUS_BADGE[reservation.status] ?? STATUS_BADGE.pending;

  const copyLink = () => {
    void navigator.clipboard.writeText(checkinLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Gestion du CTA contextuel ─────────────────────────────────────────────
  const handleCta = (e: React.MouseEvent) => {
    e.stopPropagation();
    switch (cta.action) {
      case 'relancer_checkin':
      case 'voir_contrat':
        setExpanded(true);
        break;
      case 'demander_id':
        onOpenShare(
          checkinLink,
          guest?.full_name ?? fr.app.guestFallbackName,
          propertyName
        );
        break;
      case 'valider_checkin':
        void onUpdate(reservation.id, { status: 'checked_in' });
        break;
      case 'marquer_termine':
        void onUpdate(reservation.id, { status: 'completed' });
        break;
      case 'contacter_invite':
        onOpenShare(
          checkinLink,
          guest?.full_name ?? fr.app.guestFallbackName,
          propertyName
        );
        break;
      default:
        setExpanded((v) => !v);
    }
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────
  return (
    <Card
      as="article"
      variant="default"
      padding="sm"
      interactive
      className="overflow-hidden p-0"
      data-testid={`reservation-card-${reservation.id}`}
    >
      {/* ── En-tête cliquable ────────────────────────────────────────────── */}
      <div
        className="p-4 sm:p-5 cursor-pointer"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`reservation-panel-${reservation.id}`}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        {/* Ligne 1 : référence + badge statut + logement + chevron */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900 text-sm sm:text-base leading-none">
                {reservation.booking_reference}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge.cls}`}
              >
                {statusBadge.label}
              </span>
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                {verMode === 'complete'
                  ? fr.reservations.verificationTypeComplete
                  : fr.reservations.verificationTypeSimple}
              </span>
            </div>

            {/* Ligne 2 : logement + dates + durée + voyageurs */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
              <span className="font-medium text-slate-700">{propertyName}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Calendar size={11} aria-hidden="true" />
                <time dateTime={reservation.check_in_date}>
                  {fmtShortDate(reservation.check_in_date)}
                </time>
                {' → '}
                <time dateTime={reservation.check_out_date}>
                  {fmtShortDate(reservation.check_out_date)}
                </time>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {nights} nuit{nights > 1 ? 's' : ''}
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Users size={11} aria-hidden="true" />
                {reservation.number_of_guests}{' '}
                {reservation.number_of_guests > 1 ? 'voyageurs' : 'voyageur'}
              </span>
            </div>
          </div>

          {/* Chevron */}
          <div className="shrink-0 pt-0.5">
            {expanded ? (
              <ChevronUp size={16} className="text-slate-400" aria-hidden="true" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Ligne 3 : pastilles de statut + CTA */}
        <div
          className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <ReservationStatusPills steps={steps} />
            {contract?.signed_by_guest ? <TrustBadge type="signature" /> : null}
            {isIdentityTrusted(verification?.status) ? <TrustBadge type="identity" /> : null}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* CTA contextuel */}
            <Button
              variant={cta.variant}
              size="sm"
              onClick={handleCta}
              aria-label={cta.label}
              data-testid={`reservation-cta-${reservation.id}`}
            >
              {cta.label}
            </Button>

            {/* Actions secondaires compactes */}
            <button
              type="button"
              title={fr.reservations.rateGuest}
              aria-label={fr.reservations.rateGuest}
              onClick={(e) => {
                e.stopPropagation();
                onOpenRating(reservation.id, reservation.booking_reference, reservation.guest_rating);
              }}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                reservation.guest_rating ? statusTokens.success : statusTokens.neutral
              }`}
            >
              <Star size={11} aria-hidden="true" />
              {reservation.guest_rating ? `${reservation.guest_rating}/5` : '—'}
            </button>

            <button
              type="button"
              title={fr.reservations.verificationLink}
              aria-label={fr.reservations.verificationLink}
              onClick={(e) => {
                e.stopPropagation();
                onOpenShare(
                  checkinLink,
                  guest?.full_name ?? fr.app.guestFallbackName,
                  propertyName
                );
              }}
              className={`rounded-lg border p-1.5 transition-colors ${statusTokens.neutral}`}
            >
              <Share2 size={13} aria-hidden="true" />
            </button>

            <button
              type="button"
              title={fr.reservations.details}
              aria-label={fr.reservations.details}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDocuments(reservation.id, reservation.booking_reference);
              }}
              className={`rounded-lg border p-1.5 transition-colors ${statusTokens.neutral}`}
            >
              <FileSearch size={13} aria-hidden="true" />
            </button>

            <button
              type="button"
              title={fr.reservations.deleteAction}
              aria-label={`${fr.reservations.deleteAction} ${reservation.booking_reference}`}
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(fr.reservations.deleteReservationConfirm)) {
                  void onDelete(reservation.id);
                }
              }}
              className={`rounded-lg border p-1.5 transition-colors ${statusTokens.danger}`}
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Panel détail expansible ──────────────────────────────────────── */}
      {expanded && (
        <div
          id={`reservation-panel-${reservation.id}`}
          data-testid={`reservation-panel-${reservation.id}`}
          className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-5 space-y-5 animate-[fadeIn_0.18s_ease-out]"
        >
          {/* Grille infos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{fr.reservations.checkInDateLabel}</p>
              <p className="text-sm font-semibold text-slate-900">{fmtDate(reservation.check_in_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{fr.reservations.checkOutDateLabel}</p>
              <p className="text-sm font-semibold text-slate-900">{fmtDate(reservation.check_out_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{fr.reservations.guestsLabel}</p>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                <Users size={14} aria-hidden="true" />
                {reservation.number_of_guests}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">{fr.reservations.verificationLabel}</p>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                <Shield size={14} aria-hidden="true" />
                {verMode === 'complete'
                  ? fr.reservations.verificationTypeComplete
                  : fr.reservations.verificationTypeSimple}
              </p>
            </div>
          </div>

          {/* Code serrure connectée */}
          {reservation.smart_lock_code && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <Lock size={16} className="text-amber-600" aria-hidden="true" />
              <span className="text-sm text-amber-800">
                {fr.reservations.smartLockCodeLabel} :{' '}
                <strong>{reservation.smart_lock_code}</strong>
              </span>
            </div>
          )}

          {/* Lien check-in */}
          <div>
            <p className="text-xs text-slate-500 mb-1.5">{fr.reservations.uniqueCheckinLink}</p>
            <div className="flex items-center gap-2 bg-white rounded-lg p-2.5 border border-slate-200">
              <Link2 size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={checkinLink}
                readOnly
                aria-label={fr.reservations.uniqueCheckinLink}
                className="flex-1 bg-transparent text-sm text-slate-600 outline-none min-w-0"
              />
              <button
                type="button"
                onClick={copyLink}
                aria-label={fr.reservations.copyCheckinLinkAria}
                className="shrink-0 rounded p-1.5 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                {copied ? (
                  <Check size={14} className="text-emerald-600" aria-hidden="true" />
                ) : (
                  <Copy size={14} className="text-slate-400" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Contrat */}
          {contract && (
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-700 mb-2">
                {fr.reservations.guestContractTitle}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    contract.signed_by_guest
                      ? 'bg-slate-200 text-slate-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {contract.signed_by_guest
                    ? fr.reservations.signed
                    : fr.reservations.unsigned}
                </span>
                <button
                  type="button"
                  onClick={() => onOpenDocuments(reservation.id, reservation.booking_reference)}
                  className="text-xs text-slate-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 rounded"
                >
                  {fr.reservations.preview}
                </button>
                {contract.pdf_storage_path && (
                  <span className="text-xs text-slate-500">{fr.reservations.pdfAvailable}</span>
                )}
              </div>
            </div>
          )}

          {/* Infos voyageur */}
          {guest && (
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-700 mb-2">
                {fr.reservations.guestInfoTitle}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">{fr.reservations.guestNameLabel} :</span>{' '}
                  <span className="font-medium text-slate-900">{guest.full_name}</span>
                </div>
                {verification && (
                  <div>
                    <span className="text-slate-500">{fr.reservations.guestDocumentLabel} :</span>{' '}
                    <span className="font-medium text-slate-900">
                      {verification.id_type === 'passport'
                        ? fr.reservations.docPassport
                        : verification.id_type === 'cin'
                        ? fr.reservations.docCin
                        : verification.id_type}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">{fr.reservations.guestVerificationLabel} :</span>{' '}
                  <span
                    className={`font-medium ${
                      verification?.status === 'approved'
                        ? 'text-slate-800'
                        : verification?.status === 'rejected'
                        ? 'text-red-600'
                        : verification?.status === 'pending'
                        ? 'text-amber-700'
                        : 'text-slate-400'
                    }`}
                  >
                    {verification?.status === 'approved'
                      ? fr.reservations.statusCheckedIn
                      : verification?.status === 'rejected'
                      ? fr.reservations.rejectedStatus
                      : verification?.status === 'pending'
                      ? fr.reservations.statusPending
                      : fr.reservations.statusNotStarted}
                    {verification?.document_confidence != null && (
                      <span className="ml-1.5 text-xs text-slate-400">
                        ({Math.round(verification.document_confidence * 100)} %)
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void onBlacklist(reservation, guest)}
                className={`mt-3 inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${ctaTokens.dangerSoft}`}
              >
                {fr.reservations.blockGuestAction}
              </button>
            </div>
          )}

          {/* Documents identité */}
          {verification &&
            (verification.id_document_url?.startsWith('http') ||
              verification.selfie_url?.startsWith('http')) && (
              <div className="bg-white rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-700 mb-2">
                  {fr.reservations.identitySectionTitle}
                </p>
                <SecurityNotice className="mb-3" />
                <div className="flex gap-3 flex-wrap">
                  {verification.id_document_url?.startsWith('http') && (
                    <img
                      src={verification.id_document_url}
                      alt="ID recto"
                      className="w-28 h-20 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                  {verification.id_back_url?.startsWith('http') && (
                    <img
                      src={verification.id_back_url}
                      alt="ID verso"
                      className="w-28 h-20 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                  {verification.selfie_url?.startsWith('http') && (
                    <img
                      src={verification.selfie_url}
                      alt="Selfie"
                      className="w-28 h-20 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                </div>
              </div>
            )}

          {/* Actions statut dans le panel */}
          <div className="flex gap-2 pt-1">
            {reservation.status === 'pending' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void onUpdate(reservation.id, { status: 'checked_in' })}
              >
                <ClipboardList size={14} aria-hidden="true" />
                {fr.reservations.approveCheckin}
              </Button>
            )}
            {reservation.status === 'checked_in' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void onUpdate(reservation.id, { status: 'completed' })}
              >
                <Check size={14} aria-hidden="true" />
                {fr.reservations.markComplete}
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
