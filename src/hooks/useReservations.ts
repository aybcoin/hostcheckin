import { useCallback, useEffect, useState } from 'react';
import { fr } from '../lib/i18n/fr';
import { computePriceRange } from '../lib/pricing-logic';
import { Reservation, ReservationCreateInput, supabase } from '../lib/supabase';
import type { PricingOverride, PricingRule } from '../types/pricing';

interface PricingPropertyRow {
  id: string;
  host_id: string;
  base_nightly_rate: number | string | null;
  pricing_currency: string | null;
}

interface RawPricingRuleRow extends Omit<
  PricingRule,
  'priority' | 'multiplier' | 'flat_adjustment' | 'weekdays' | 'min_nights_threshold' | 'lead_days_min' | 'lead_days_max'
> {
  priority: number | string;
  multiplier: number | string;
  flat_adjustment: number | string;
  weekdays: number[] | null;
  min_nights_threshold: number | string | null;
  lead_days_min: number | string | null;
  lead_days_max: number | string | null;
}

interface RawPricingOverrideRow extends Omit<PricingOverride, 'nightly_rate'> {
  nightly_rate: number | string;
}

interface PricingReservationRow {
  check_in_date: string;
  check_out_date: string;
  property_id: string;
  status: string;
}

function toFiniteNumber(value: number | string, fallback: number = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: number | string | null): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRule(row: RawPricingRuleRow): PricingRule {
  return {
    ...row,
    priority: toFiniteNumber(row.priority),
    multiplier: toFiniteNumber(row.multiplier, 1),
    flat_adjustment: toFiniteNumber(row.flat_adjustment),
    weekdays: Array.isArray(row.weekdays) ? row.weekdays : [],
    min_nights_threshold: toNullableNumber(row.min_nights_threshold),
    lead_days_min: toNullableNumber(row.lead_days_min),
    lead_days_max: toNullableNumber(row.lead_days_max),
  };
}

function normalizeOverride(row: RawPricingOverrideRow): PricingOverride {
  return {
    ...row,
    nightly_rate: toFiniteNumber(row.nightly_rate),
  };
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function previousDay(date: string): string | null {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setUTCDate(parsed.getUTCDate() - 1);
  return parsed.toISOString().slice(0, 10);
}

export function useReservations(propertyId?: string | null) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = useCallback(async (showLoader: boolean = true) => {
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      let query = supabase
        .from('reservations')
        .select('*, properties(name, address), contracts(*), verifications:identity_verification(*)');

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error: fetchError } = await query.order('check_in_date', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setReservations((data || []) as Reservation[]);
      setError(null);
    } catch (fetchError) {
      console.error('[useReservations] Failed to load reservations:', fetchError);
      setError(fr.errors.reservations);
    } finally {
      if (showLoader) {
        setIsLoading(false);
      }
    }
  }, [propertyId]);

  useEffect(() => {
    void fetchReservations(true);
  }, [fetchReservations]);

  useEffect(() => {
    const channel = supabase
      .channel(`reservations-live-${propertyId || 'all'}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
        },
        (payload) => {
          if (propertyId) {
            const changedRow = (payload.new || payload.old || {}) as { property_id?: string };
            if (changedRow.property_id && changedRow.property_id !== propertyId) {
              return;
            }
          }
          void fetchReservations(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchReservations, propertyId]);

  const refresh = useCallback(() => {
    void fetchReservations(true);
  }, [fetchReservations]);

  const generateUniqueLink = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const enrichReservationTotal = useCallback(async (
    reservation: ReservationCreateInput,
  ): Promise<ReservationCreateInput> => {
    if (reservation.total_amount != null) return reservation;
    if (!reservation.property_id || !reservation.check_in_date || !reservation.check_out_date) {
      return reservation;
    }

    const rangeEnd = previousDay(reservation.check_out_date);
    if (!rangeEnd || rangeEnd < reservation.check_in_date) {
      return reservation;
    }

    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('id, host_id, base_nightly_rate, pricing_currency')
      .eq('id', reservation.property_id)
      .maybeSingle();

    if (propertyError || !propertyData) {
      if (propertyError) {
        console.error('[useReservations] Failed to load property pricing context:', propertyError);
      }
      return reservation;
    }

    const property = propertyData as PricingPropertyRow;
    const baseRate = toNullableNumber(property.base_nightly_rate);
    if (baseRate == null) return reservation;

    const [rulesResult, overridesResult, reservationsResult] = await Promise.all([
      supabase
        .from('pricing_rules')
        .select('*')
        .eq('host_id', property.host_id)
        .eq('is_active', true),
      supabase
        .from('pricing_overrides')
        .select('*')
        .eq('host_id', property.host_id)
        .eq('property_id', reservation.property_id)
        .gte('target_date', reservation.check_in_date)
        .lte('target_date', rangeEnd),
      supabase
        .from('reservations')
        .select('check_in_date, check_out_date, property_id, status')
        .eq('property_id', reservation.property_id),
    ]);

    if (rulesResult.error || overridesResult.error || reservationsResult.error) {
      console.error('[useReservations] Failed to load pricing inputs:', {
        rulesError: rulesResult.error,
        overridesError: overridesResult.error,
        reservationsError: reservationsResult.error,
      });
      return reservation;
    }

    const nightlyComputations = computePriceRange({
      propertyId: reservation.property_id,
      date: reservation.check_in_date,
      baseRate,
      currency: property.pricing_currency || 'EUR',
      rules: ((rulesResult.data || []) as RawPricingRuleRow[]).map(normalizeRule),
      overrides: ((overridesResult.data || []) as RawPricingOverrideRow[]).map(normalizeOverride),
      reservations: (reservationsResult.data || []) as PricingReservationRow[],
      today: todayYmd(),
      range: {
        start: reservation.check_in_date,
        end: rangeEnd,
      },
    });

    if (nightlyComputations.length === 0) return reservation;

    const totalAmount = nightlyComputations.reduce((sum, computation) => sum + computation.finalRate, 0);
    return {
      ...reservation,
      total_amount: Math.round((totalAmount + Number.EPSILON) * 100) / 100,
    };
  }, []);

  const addReservation = async (reservation: ReservationCreateInput) => {
    const uniqueLink = generateUniqueLink();
    const verificationMode = reservation.verification_mode || reservation.verification_type || 'simple';
    const reservationWithAmount = await enrichReservationTotal(reservation);

    const { data, error: insertError } = await supabase
      .from('reservations')
      .insert([{
        ...reservationWithAmount,
        verification_mode: verificationMode,
        verification_type: reservationWithAmount.verification_type || verificationMode,
        unique_link: uniqueLink,
      }])
      .select();

    if (insertError) {
      console.error('Supabase error (reservations.insert):', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });
      return { data, error: insertError };
    }

    await fetchReservations(false);
    return { data, error: insertError };
  };

  const updateReservation = async (id: string, updates: Partial<Reservation>) => {
    const { error: updateError } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id);

    if (!updateError) {
      await fetchReservations(false);
    }

    return { error: updateError };
  };

  const deleteReservation = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (!deleteError) {
      await fetchReservations(false);
    }

    return { error: deleteError };
  };

  return {
    reservations,
    loading: isLoading,
    isLoading,
    error,
    addReservation,
    updateReservation,
    deleteReservation,
    refresh,
    refetch: refresh,
  };
}
