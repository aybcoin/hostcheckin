import { useCallback, useEffect, useMemo, useState } from 'react';
import { fr } from '../lib/i18n/fr';
import { supabase } from '../lib/supabase';
import type { GuestPortalStep, GuestSession } from '../types/guest-portal';

type GuestTokenRow = {
  id: string;
  token: string;
  reservation_id: string;
  expires_at: string;
  used_at: string | null;
};

type GuestRelation = {
  full_name?: string | null;
};

type HostRelation = {
  full_name?: string | null;
};

type PropertyRelation = {
  name?: string | null;
  hosts?: HostRelation | HostRelation[] | null;
};

type ContractRelation = {
  signed_by_guest?: boolean | null;
  pdf_url?: string | null;
  pdf_storage_path?: string | null;
};

type IdentityRelation = {
  status?: string | null;
};

type ReservationRow = {
  id: string;
  status?: string | null;
  check_in_date: string;
  check_out_date: string;
  guests?: GuestRelation | GuestRelation[] | null;
  properties?: PropertyRelation | PropertyRelation[] | null;
  contracts?: ContractRelation[] | ContractRelation | null;
  identity_verification?: IdentityRelation[] | IdentityRelation | null;
};

function asArray<T>(value: T[] | T | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function asSingle<T>(value: T[] | T | null | undefined): T | null {
  return asArray(value)[0] ?? null;
}

function resolveContractUrl(contracts: ContractRelation[]): string | null {
  const withPdfUrl = contracts.find((item) => typeof item.pdf_url === 'string' && item.pdf_url.length > 0);
  if (withPdfUrl?.pdf_url) {
    return withPdfUrl.pdf_url;
  }

  const withStoragePath = contracts.find(
    (item) => typeof item.pdf_storage_path === 'string' && item.pdf_storage_path.length > 0,
  );
  if (withStoragePath?.pdf_storage_path) {
    const { data } = supabase.storage.from('checkin-files').getPublicUrl(withStoragePath.pdf_storage_path);
    return data.publicUrl;
  }

  return null;
}

function isIdentityApproved(status: string | null | undefined): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return normalized === 'approved' || normalized === 'verified' || normalized === 'ok';
}

function deriveStep(session: GuestSession): GuestPortalStep {
  if (session.identityVerified) return 'confirmation';
  if (session.contractSigned) return 'identity';
  return 'welcome';
}

export function useGuestPortal(token: string) {
  const [session, setSession] = useState<GuestSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<GuestPortalStep>('welcome');

  useEffect(() => {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      setError(fr.guestPortal.errors.invalidToken);
      setSession(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const fetchSession = async () => {
      setIsLoading(true);
      setError(null);

      const { data: tokenData, error: tokenError } = await supabase
        .from('guest_tokens')
        .select('*')
        .eq('token', normalizedToken)
        .maybeSingle();

      if (cancelled) return;

      if (tokenError || !tokenData) {
        setSession(null);
        setError(fr.guestPortal.errors.invalidToken);
        setIsLoading(false);
        return;
      }

      const typedToken = tokenData as GuestTokenRow;
      if (new Date(typedToken.expires_at).getTime() <= Date.now()) {
        setSession(null);
        setError(fr.guestPortal.errors.invalidToken);
        setIsLoading(false);
        return;
      }

      if (!typedToken.used_at) {
        await supabase
          .from('guest_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('id', typedToken.id)
          .is('used_at', null);
      }

      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .select(`
          id,
          status,
          check_in_date,
          check_out_date,
          guests ( full_name ),
          properties ( name, hosts ( full_name ) ),
          contracts ( signed_by_guest, pdf_url, pdf_storage_path ),
          identity_verification ( status )
        `)
        .eq('id', typedToken.reservation_id)
        .maybeSingle();

      if (cancelled) return;

      if (reservationError || !reservationData) {
        setSession(null);
        setError(fr.guestPortal.errors.invalidToken);
        setIsLoading(false);
        return;
      }

      const reservation = reservationData as ReservationRow;
      const guest = asSingle(reservation.guests);
      const property = asSingle(reservation.properties);
      const host = asSingle(property?.hosts ?? null);
      const contracts = asArray(reservation.contracts);
      const identities = asArray(reservation.identity_verification);
      const reservationStatus = (reservation.status ?? '').toLowerCase();

      const nextSession: GuestSession = {
        token: typedToken.token,
        reservationId: typedToken.reservation_id,
        guestName: guest?.full_name || fr.app.guestFallbackName,
        propertyName: property?.name || fr.reservations.unknownProperty,
        checkinDate: reservation.check_in_date,
        checkoutDate: reservation.check_out_date,
        hostName: host?.full_name || fr.app.hostFallbackName,
        contractUrl: resolveContractUrl(contracts),
        identityVerified:
          identities.some((item) => isIdentityApproved(item.status)) || reservationStatus === 'verified',
        contractSigned:
          contracts.some((item) => Boolean(item.signed_by_guest)) ||
          reservationStatus === 'contract_signed' ||
          reservationStatus === 'verified',
      };

      setSession(nextSession);
      setCurrentStep(deriveStep(nextSession));
      setIsLoading(false);
    };

    void fetchSession();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const goToStep = useCallback((step: GuestPortalStep) => {
    setCurrentStep(step);
  }, []);

  const markContractSigned = useCallback(async () => {
    if (!session) return false;

    setError(null);

    const { error: updateError } = await supabase
      .from('reservations')
      .update({ status: 'contract_signed' })
      .eq('id', session.reservationId);

    if (updateError) {
      setError(fr.guestPortal.errors.signError);
      return false;
    }

    setSession((previous) => (previous ? { ...previous, contractSigned: true } : previous));
    setCurrentStep('identity');
    return true;
  }, [session]);

  const markIdentityVerified = useCallback(async () => {
    if (!session) return false;

    setError(null);

    const { error: updateError } = await supabase
      .from('reservations')
      .update({ status: 'verified' })
      .eq('id', session.reservationId);

    if (updateError) {
      setError(fr.guestPortal.errors.uploadError);
      return false;
    }

    setSession((previous) =>
      previous
        ? {
            ...previous,
            contractSigned: true,
            identityVerified: true,
          }
        : previous,
    );
    setCurrentStep('confirmation');
    return true;
  }, [session]);

  return useMemo(
    () => ({
      session,
      isLoading,
      error,
      currentStep,
      goToStep,
      markContractSigned,
      markIdentityVerified,
    }),
    [session, isLoading, error, currentStep, goToStep, markContractSigned, markIdentityVerified],
  );
}
