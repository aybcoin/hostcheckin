import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGuestT } from '../lib/i18n/guest/context';
import { supabase } from '../lib/supabase';
import type { GuestPortalStep, GuestSession, PoliceBulletinPrefill } from '../types/guest-portal';
import type { PoliceBulletinDraft } from '../types/police-bulletin';

type GuestTokenRow = {
  id: string;
  token: string;
  reservation_id: string;
  expires_at: string;
  used_at: string | null;
};

type GuestRelation = {
  full_name?: string | null;
  country?: string | null;
};

type HostRelation = {
  id?: string | null;
  full_name?: string | null;
  identity_retention_months?: number | null;
  police_bulletin_enabled?: boolean | null;
};

type PropertyRelation = {
  id?: string | null;
  name?: string | null;
  appart_no?: string | null;
  hosts?: HostRelation | HostRelation[] | null;
};

type ContractRelation = {
  signed_by_guest?: boolean | null;
  pdf_url?: string | null;
  pdf_storage_path?: string | null;
};

type IdentityRelation = {
  status?: string | null;
  ocr_data?: {
    declared_name?: string | null;
    extracted_name?: string | null;
    document_number?: string | null;
    birth_date?: string | null;
    birth_place?: string | null;
    nationality?: string | null;
  } | null;
};

type PoliceBulletinRelation = {
  id?: string | null;
  submitted_at?: string | null;
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
  police_bulletins?: PoliceBulletinRelation[] | PoliceBulletinRelation | null;
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

function splitName(fullName: string | null | undefined): { first: string; last: string } {
  const safe = (fullName ?? '').trim();
  if (!safe) return { first: '', last: '' };
  const parts = safe.split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

function buildPolicePrefill(args: {
  guest: GuestRelation | null;
  property: PropertyRelation | null;
  host: HostRelation | null;
  identity: IdentityRelation | null;
  arrivalDate: string;
}): PoliceBulletinPrefill {
  const ocr = args.identity?.ocr_data ?? null;
  const ocrName = ocr?.declared_name || ocr?.extracted_name || args.guest?.full_name || '';
  const split = splitName(ocrName);
  return {
    fullName: split.last || split.first,
    firstName: split.first,
    dateOfBirth: ocr?.birth_date || null,
    placeOfBirth: ocr?.birth_place || '',
    nationality: ocr?.nationality || args.guest?.country || '',
    passportNo: ocr?.document_number || '',
    appartNo: args.property?.appart_no ?? null,
    arrivalDate: args.arrivalDate,
    propertyName: args.property?.name || '',
    hostId: args.host?.id || '',
    propertyId: args.property?.id || null,
  };
}

function deriveStep(session: GuestSession): GuestPortalStep {
  if (session.identityVerified) {
    if (session.policeBulletinEnabled && !session.policeBulletinSubmitted) {
      return 'police';
    }
    return 'confirmation';
  }
  if (session.contractSigned) return 'identity';
  return 'welcome';
}

export function useGuestPortal(token: string) {
  const t = useGuestT();
  const [session, setSession] = useState<GuestSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<GuestPortalStep>('welcome');

  useEffect(() => {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      setError(t.guestPortal.errors.invalidToken);
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
        setError(t.guestPortal.errors.invalidToken);
        setIsLoading(false);
        return;
      }

      const typedToken = tokenData as GuestTokenRow;
      const isExpired = new Date(typedToken.expires_at).getTime() <= Date.now();
      const isConsumed = Boolean(typedToken.used_at);
      if (isExpired || isConsumed) {
        setSession(null);
        setError(t.guestPortal.errors.invalidToken);
        setIsLoading(false);
        return;
      }

      const { data: reservationData, error: reservationError } = await supabase
        .from('reservations')
        .select(`
          id,
          status,
          check_in_date,
          check_out_date,
          guests ( full_name, country ),
          properties ( id, name, appart_no, hosts ( id, full_name, identity_retention_months, police_bulletin_enabled ) ),
          contracts ( signed_by_guest, pdf_url, pdf_storage_path ),
          identity_verification ( status, ocr_data ),
          police_bulletins ( id, submitted_at )
        `)
        .eq('id', typedToken.reservation_id)
        .maybeSingle();

      if (cancelled) return;

      if (reservationError || !reservationData) {
        setSession(null);
        setError(t.guestPortal.errors.invalidToken);
        setIsLoading(false);
        return;
      }

      const reservation = reservationData as ReservationRow;
      const guest = asSingle(reservation.guests);
      const property = asSingle(reservation.properties);
      const host = asSingle(property?.hosts ?? null);
      const contracts = asArray(reservation.contracts);
      const identities = asArray(reservation.identity_verification);
      const policeBulletins = asArray(reservation.police_bulletins);
      const reservationStatus = (reservation.status ?? '').toLowerCase();

      const policePrefill = buildPolicePrefill({
        guest,
        property,
        host,
        identity: asSingle(reservation.identity_verification),
        arrivalDate: reservation.check_in_date,
      });

      const nextSession: GuestSession = {
        token: typedToken.token,
        reservationId: typedToken.reservation_id,
        guestName: guest?.full_name || t.app.guestFallbackName,
        propertyName: property?.name || t.reservations.unknownProperty,
        checkinDate: reservation.check_in_date,
        checkoutDate: reservation.check_out_date,
        hostName: host?.full_name || t.app.hostFallbackName,
        identityRetentionMonths:
          typeof host?.identity_retention_months === 'number' && host.identity_retention_months > 0
            ? host.identity_retention_months
            : 12,
        contractUrl: resolveContractUrl(contracts),
        identityVerified:
          identities.some((item) => isIdentityApproved(item.status)) || reservationStatus === 'verified',
        contractSigned:
          contracts.some((item) => Boolean(item.signed_by_guest)) ||
          reservationStatus === 'contract_signed' ||
          reservationStatus === 'verified',
        policeBulletinEnabled: Boolean(host?.police_bulletin_enabled),
        policeBulletinSubmitted: policeBulletins.some((item) => Boolean(item.submitted_at)),
        policePrefill,
      };

      setSession(nextSession);
      setCurrentStep(deriveStep(nextSession));
      setIsLoading(false);
    };

    void fetchSession();

    return () => {
      cancelled = true;
    };
  }, [t, token]);

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
      setError(t.guestPortal.errors.signError);
      return false;
    }

    // Notify the host by email that the contract has been signed.
    // The edge function resolves host email + property name server-side
    // from the reservationId, so the anonymous guest doesn't need any of
    // that PII. Failure here must not block the check-in flow — we just
    // warn and continue.
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (supabaseUrl) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (supabaseAnonKey) {
          headers.apikey = supabaseAnonKey;
          headers.Authorization = `Bearer ${supabaseAnonKey}`;
        }
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            reservationId: session.reservationId,
            trigger: 'contract_signed',
            channel: 'email',
            recipientType: 'host',
          }),
        }).catch((err) => console.warn('contract_signed notification failed:', err));
      }
    } catch (err) {
      console.warn('contract_signed notification dispatch failed:', err);
    }

    setSession((previous) => (previous ? { ...previous, contractSigned: true } : previous));
    setCurrentStep('identity');
    return true;
  }, [session, t]);

  const markIdentityVerified = useCallback(async () => {
    if (!session) return false;

    setError(null);

    const { error: updateError } = await supabase
      .from('reservations')
      .update({ status: 'verified' })
      .eq('id', session.reservationId);

    if (updateError) {
      setError(t.guestPortal.errors.uploadError);
      return false;
    }

    await supabase
      .from('guest_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', session.token)
      .is('used_at', null);

    // Fire the host-side "identity verified" notification. Same fire-and-
    // forget pattern as contract_signed — never block the guest UX.
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (supabaseUrl) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (supabaseAnonKey) {
          headers.apikey = supabaseAnonKey;
          headers.Authorization = `Bearer ${supabaseAnonKey}`;
        }
        await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            reservationId: session.reservationId,
            trigger: 'verification_complete',
            channel: 'email',
            recipientType: 'host',
          }),
        }).catch((err) => console.warn('verification_complete notification failed:', err));
      }
    } catch (err) {
      console.warn('verification_complete notification dispatch failed:', err);
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
    setCurrentStep(
      session.policeBulletinEnabled && !session.policeBulletinSubmitted ? 'police' : 'confirmation',
    );
    return true;
  }, [session, t]);

  const submitPoliceBulletin = useCallback(async (draft: PoliceBulletinDraft) => {
    if (!session) return false;
    setError(null);

    const payload = {
      reservation_id: draft.reservation_id,
      host_id: draft.host_id,
      property_id: draft.property_id,
      appart_no: draft.appart_no,
      full_name: draft.full_name,
      first_name: draft.first_name,
      date_of_birth: draft.date_of_birth,
      place_of_birth: draft.place_of_birth,
      nationality: draft.nationality,
      profession: draft.profession,
      coming_from: draft.coming_from,
      going_to: draft.going_to,
      arrival_date: draft.arrival_date,
      home_address: draft.home_address,
      passport_no: draft.passport_no,
      submitted_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('police_bulletins')
      .upsert(payload, { onConflict: 'reservation_id' });

    if (upsertError) {
      console.warn('police_bulletin upsert failed:', upsertError);
      setError(t.guestPortal.errors.uploadError);
      return false;
    }

    setSession((previous) => (previous ? { ...previous, policeBulletinSubmitted: true } : previous));
    setCurrentStep('confirmation');
    return true;
  }, [session, t]);

  return useMemo(
    () => ({
      session,
      isLoading,
      error,
      currentStep,
      goToStep,
      markContractSigned,
      markIdentityVerified,
      submitPoliceBulletin,
    }),
    [
      session,
      isLoading,
      error,
      currentStep,
      goToStep,
      markContractSigned,
      markIdentityVerified,
      submitPoliceBulletin,
    ],
  );
}
