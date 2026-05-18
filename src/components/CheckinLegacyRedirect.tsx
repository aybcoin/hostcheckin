import { useEffect, useState } from 'react';
import { clsx } from '../lib/clsx';
import { borderTokens, statusTokens, surfaceTokens, textTokens } from '../lib/design-tokens';
import { supabase } from '../lib/supabase';

interface CheckinLegacyRedirectProps {
  uniqueLink: string;
  onResolved: (token: string) => void;
  onFailed?: () => void;
}

interface ReservationLookupRow {
  id: string;
  check_in_date: string | null;
  check_out_date: string | null;
}

interface TokenRow {
  token: string;
  used_at: string | null;
}

/**
 * Bridges the legacy `/checkin/:unique_link` URL onto the new
 * `/check-in/:guest_token` flow. Looks up the reservation by its
 * `unique_link`, fetches (or mints) a guest_token, then hands the
 * token back to the App so it can render the modern GuestPortalPage —
 * the one that includes the police bulletin step.
 *
 * Renders a discreet loading card during the round trip (typically <1s).
 * On any failure it falls back to letting the parent render the legacy
 * VerificationPage so the guest is never blocked.
 */
export function CheckinLegacyRedirect({ uniqueLink, onResolved, onFailed }: CheckinLegacyRedirectProps) {
  const [status, setStatus] = useState<'pending' | 'failed'>('pending');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .select('id, check_in_date, check_out_date')
        .eq('unique_link', uniqueLink)
        .maybeSingle();

      if (cancelled) return;

      const typedReservation = reservation as ReservationLookupRow | null;
      if (reservationError || !typedReservation) {
        setStatus('failed');
        onFailed?.();
        return;
      }

      const nowIso = new Date().toISOString();

      const { data: existingToken } = await supabase
        .from('guest_tokens')
        .select('token, used_at')
        .eq('reservation_id', typedReservation.id)
        .is('used_at', null)
        .gt('expires_at', nowIso)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      const reusable = (existingToken as TokenRow | null)?.token;
      if (reusable) {
        const target = `/check-in/${reusable}`;
        try {
          window.history.replaceState({}, '', target);
        } catch {
          /* noop — replaceState can throw in some cross-origin edge cases */
        }
        onResolved(reusable);
        return;
      }

      const checkoutDate = typedReservation.check_out_date
        ? new Date(`${typedReservation.check_out_date}T23:59:59Z`)
        : null;
      const expiresAt =
        checkoutDate && Number.isFinite(checkoutDate.getTime())
          ? new Date(checkoutDate.getTime() + 24 * 60 * 60 * 1000).toISOString()
          : null;

      const { data: inserted, error: insertError } = await supabase
        .from('guest_tokens')
        .insert(
          expiresAt
            ? { reservation_id: typedReservation.id, expires_at: expiresAt }
            : { reservation_id: typedReservation.id },
        )
        .select('token')
        .single();

      if (cancelled) return;

      const created = (inserted as { token?: string } | null)?.token;
      if (insertError || !created) {
        setStatus('failed');
        onFailed?.();
        return;
      }

      try {
        window.history.replaceState({}, '', `/check-in/${created}`);
      } catch {
        /* noop */
      }
      onResolved(created);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [uniqueLink, onResolved]);

  if (status === 'failed') {
    return null;
  }

  return (
    <div className={clsx('flex min-h-screen items-center justify-center px-4', surfaceTokens.app)}>
      <div
        className={clsx(
          'rounded-xl border px-4 py-3 text-sm',
          borderTokens.default,
          surfaceTokens.panel,
          textTokens.body,
        )}
      >
        Préparation de votre check-in…
      </div>
    </div>
  );
}

export const checkinLegacyFallbackTone = statusTokens.warning;
