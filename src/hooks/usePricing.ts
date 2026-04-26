import { useCallback, useEffect, useMemo, useState } from 'react';
import { computePriceForDate } from '../lib/pricing-logic';
import { fr } from '../lib/i18n/fr';
import { supabase, type Property } from '../lib/supabase';
import type { PriceComputation, PricingOverride, PricingOverrideCreateInput, PricingOverrideWithRelations, PricingRule, PricingRuleCreateInput, PricingRuleWithRelations } from '../types/pricing';

type PricingReservation = {
  check_in_date: string;
  check_out_date: string;
  property_id: string;
  status: string;
};

type PricingProperty = Pick<Property, 'id' | 'host_id' | 'name' | 'base_nightly_rate' | 'pricing_currency'>;

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
  properties?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface RawPricingOverrideRow extends Omit<PricingOverride, 'nightly_rate'> {
  nightly_rate: number | string;
  properties?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface RawPricingPropertyRow extends Omit<PricingProperty, 'base_nightly_rate' | 'pricing_currency'> {
  base_nightly_rate: number | string | null;
  pricing_currency: string | null;
}

interface SupabaseErrorLike {
  message: string;
}

function toSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof (error as SupabaseErrorLike).message === 'string'
  ) {
    return new Error((error as SupabaseErrorLike).message);
  }
  return new Error('Unknown error');
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

function normalizeRule(row: RawPricingRuleRow): PricingRuleWithRelations {
  const property = toSingle(row.properties);
  return {
    ...row,
    priority: toFiniteNumber(row.priority),
    multiplier: toFiniteNumber(row.multiplier, 1),
    flat_adjustment: toFiniteNumber(row.flat_adjustment),
    weekdays: Array.isArray(row.weekdays) ? row.weekdays : [],
    min_nights_threshold: toNullableNumber(row.min_nights_threshold),
    lead_days_min: toNullableNumber(row.lead_days_min),
    lead_days_max: toNullableNumber(row.lead_days_max),
    property_name: property?.name ?? undefined,
  };
}

function normalizeOverride(row: RawPricingOverrideRow): PricingOverrideWithRelations {
  const property = toSingle(row.properties);
  return {
    ...row,
    nightly_rate: toFiniteNumber(row.nightly_rate),
    property_name: property?.name ?? undefined,
  };
}

function normalizeProperty(row: RawPricingPropertyRow): PricingProperty {
  return {
    ...row,
    base_nightly_rate: toNullableNumber(row.base_nightly_rate),
    pricing_currency: row.pricing_currency ?? 'EUR',
  };
}

function normalizeCurrency(currency: string | undefined | null): string {
  const normalized = currency?.trim().toUpperCase() ?? '';
  return normalized || 'EUR';
}

export interface UsePricingResult {
  rules: PricingRuleWithRelations[];
  overrides: PricingOverrideWithRelations[];
  properties: PricingProperty[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createRule: (
    input: PricingRuleCreateInput,
  ) => Promise<{ data: PricingRule | null; error: Error | null }>;
  updateRule: (
    id: string,
    patch: Partial<PricingRuleCreateInput>,
  ) => Promise<{ error: Error | null }>;
  deleteRule: (id: string) => Promise<{ error: Error | null }>;
  toggleRuleActive: (id: string, isActive: boolean) => Promise<{ error: Error | null }>;
  createOverride: (
    input: PricingOverrideCreateInput,
  ) => Promise<{ data: PricingOverride | null; error: Error | null }>;
  deleteOverride: (id: string) => Promise<{ error: Error | null }>;
  updatePropertyBaseRate: (
    propertyId: string,
    rate: number | null,
    currency?: string,
  ) => Promise<{ error: Error | null }>;
  computePriceForProperty: (
    propertyId: string,
    date: string,
    opts?: {
      today?: string;
      reservations?: PricingReservation[];
    },
  ) => PriceComputation | null;
}

export function usePricing(hostId: string | null): UsePricingResult {
  const [rules, setRules] = useState<PricingRuleWithRelations[]>([]);
  const [overrides, setOverrides] = useState<PricingOverrideWithRelations[]>([]);
  const [properties, setProperties] = useState<PricingProperty[]>([]);
  const [reservations, setReservations] = useState<PricingReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (showLoader: boolean = true) => {
      if (!hostId) {
        setRules([]);
        setOverrides([]);
        setProperties([]);
        setReservations([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (showLoader) setLoading(true);

      try {
        const [rulesResult, overridesResult, propertiesResult] = await Promise.all([
          supabase
            .from('pricing_rules')
            .select(['*', 'properties(name)'].join(', '))
            .eq('host_id', hostId)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase
            .from('pricing_overrides')
            .select(['*', 'properties(name)'].join(', '))
            .eq('host_id', hostId)
            .order('target_date', { ascending: true })
            .order('created_at', { ascending: false }),
          supabase
            .from('properties')
            .select('id, host_id, name, base_nightly_rate, pricing_currency')
            .eq('host_id', hostId)
            .order('name', { ascending: true }),
        ]);

        if (rulesResult.error) throw rulesResult.error;
        if (overridesResult.error) throw overridesResult.error;
        if (propertiesResult.error) throw propertiesResult.error;

        const propertyRows = (propertiesResult.data || []) as RawPricingPropertyRow[];
        const propertyIds = propertyRows.map((property) => property.id);

        let reservationRows: PricingReservation[] = [];
        if (propertyIds.length > 0) {
          const { data: reservationsData, error: reservationsError } = await supabase
            .from('reservations')
            .select('check_in_date, check_out_date, property_id, status')
            .in('property_id', propertyIds);

          if (reservationsError) throw reservationsError;
          reservationRows = (reservationsData || []) as unknown as PricingReservation[];
        }

        setRules(((rulesResult.data || []) as unknown as RawPricingRuleRow[]).map(normalizeRule));
        setOverrides(((overridesResult.data || []) as unknown as RawPricingOverrideRow[]).map(normalizeOverride));
        setProperties(propertyRows.map(normalizeProperty));
        setReservations(reservationRows);
        setError(null);
      } catch (fetchError) {
        console.error('[usePricing] Failed to load pricing data:', fetchError);
        setError(fr.pricingEngine.loadError);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [hostId],
  );

  useEffect(() => {
    void fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (!hostId) return;

    const channel = supabase
      .channel(`pricing-live-${hostId}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pricing_rules' },
        () => {
          void fetchData(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pricing_overrides' },
        () => {
          void fetchData(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'properties' },
        () => {
          void fetchData(false);
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          void fetchData(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchData, hostId]);

  const refresh = useCallback(() => {
    void fetchData(true);
  }, [fetchData]);

  const createRule = useCallback<UsePricingResult['createRule']>(
    async (input) => {
      if (!hostId) return { data: null, error: new Error('Missing hostId') };

      const payload = {
        host_id: hostId,
        property_id: input.property_id ?? null,
        name: input.name.trim(),
        rule_type: input.rule_type,
        priority: input.priority ?? 0,
        is_active: input.is_active ?? true,
        multiplier: input.multiplier,
        flat_adjustment: input.flat_adjustment ?? 0,
        weekdays: input.weekdays ?? [],
        start_date: input.start_date ?? null,
        end_date: input.end_date ?? null,
        min_nights_threshold: input.min_nights_threshold ?? null,
        lead_days_min: input.lead_days_min ?? null,
        lead_days_max: input.lead_days_max ?? null,
        notes: input.notes?.trim() || null,
      };

      const { data, error: insertError } = await supabase
        .from('pricing_rules')
        .insert([payload])
        .select('*')
        .single();

      if (insertError) {
        return { data: null, error: toError(insertError) };
      }

      await fetchData(false);
      return {
        data: normalizeRule(data as RawPricingRuleRow),
        error: null,
      };
    },
    [fetchData, hostId],
  );

  const updateRule = useCallback<UsePricingResult['updateRule']>(
    async (id, patch) => {
      const updates: Record<string, unknown> = {};

      if (patch.property_id !== undefined) updates.property_id = patch.property_id;
      if (patch.name !== undefined) updates.name = patch.name.trim();
      if (patch.rule_type !== undefined) updates.rule_type = patch.rule_type;
      if (patch.priority !== undefined) updates.priority = patch.priority;
      if (patch.is_active !== undefined) updates.is_active = patch.is_active;
      if (patch.multiplier !== undefined) updates.multiplier = patch.multiplier;
      if (patch.flat_adjustment !== undefined) updates.flat_adjustment = patch.flat_adjustment;
      if (patch.weekdays !== undefined) updates.weekdays = patch.weekdays;
      if (patch.start_date !== undefined) updates.start_date = patch.start_date ?? null;
      if (patch.end_date !== undefined) updates.end_date = patch.end_date ?? null;
      if (patch.min_nights_threshold !== undefined) {
        updates.min_nights_threshold = patch.min_nights_threshold ?? null;
      }
      if (patch.lead_days_min !== undefined) updates.lead_days_min = patch.lead_days_min ?? null;
      if (patch.lead_days_max !== undefined) updates.lead_days_max = patch.lead_days_max ?? null;
      if (patch.notes !== undefined) updates.notes = patch.notes?.trim() || null;

      if (Object.keys(updates).length === 0) return { error: null };

      const { error: updateError } = await supabase
        .from('pricing_rules')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        return { error: toError(updateError) };
      }

      await fetchData(false);
      return { error: null };
    },
    [fetchData],
  );

  const deleteRule = useCallback<UsePricingResult['deleteRule']>(
    async (id) => {
      const { error: deleteError } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return { error: toError(deleteError) };
      }

      await fetchData(false);
      return { error: null };
    },
    [fetchData],
  );

  const toggleRuleActive = useCallback<UsePricingResult['toggleRuleActive']>(
    async (id, isActive) => updateRule(id, { is_active: isActive }),
    [updateRule],
  );

  const createOverride = useCallback<UsePricingResult['createOverride']>(
    async (input) => {
      if (!hostId) return { data: null, error: new Error('Missing hostId') };

      const payload = {
        host_id: hostId,
        property_id: input.property_id,
        target_date: input.target_date,
        nightly_rate: input.nightly_rate,
        reason: input.reason?.trim() || null,
      };

      const { data, error: insertError } = await supabase
        .from('pricing_overrides')
        .insert([payload])
        .select('*')
        .single();

      if (insertError) {
        return { data: null, error: toError(insertError) };
      }

      await fetchData(false);
      return {
        data: normalizeOverride(data as RawPricingOverrideRow),
        error: null,
      };
    },
    [fetchData, hostId],
  );

  const deleteOverride = useCallback<UsePricingResult['deleteOverride']>(
    async (id) => {
      const { error: deleteError } = await supabase
        .from('pricing_overrides')
        .delete()
        .eq('id', id);

      if (deleteError) {
        return { error: toError(deleteError) };
      }

      await fetchData(false);
      return { error: null };
    },
    [fetchData],
  );

  const updatePropertyBaseRate = useCallback<UsePricingResult['updatePropertyBaseRate']>(
    async (propertyId, rate, currency) => {
      const updates: Record<string, unknown> = {
        base_nightly_rate: rate,
      };

      if (currency !== undefined) {
        updates.pricing_currency = normalizeCurrency(currency);
      }

      const { error: updateError } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', propertyId);

      if (updateError) {
        return { error: toError(updateError) };
      }

      await fetchData(false);
      return { error: null };
    },
    [fetchData],
  );

  const computePriceForProperty = useCallback<UsePricingResult['computePriceForProperty']>(
    (propertyId, date, opts) => {
      const property = properties.find((entry) => entry.id === propertyId);
      if (!property || property.base_nightly_rate == null || !Number.isFinite(property.base_nightly_rate)) {
        return null;
      }

      return computePriceForDate({
        propertyId,
        date,
        baseRate: property.base_nightly_rate,
        currency: normalizeCurrency(property.pricing_currency),
        rules,
        overrides,
        reservations: opts?.reservations ?? reservations,
        today: opts?.today,
      });
    },
    [overrides, properties, reservations, rules],
  );

  const result = useMemo<UsePricingResult>(
    () => ({
      rules,
      overrides,
      properties,
      loading,
      error,
      refresh,
      createRule,
      updateRule,
      deleteRule,
      toggleRuleActive,
      createOverride,
      deleteOverride,
      updatePropertyBaseRate,
      computePriceForProperty,
    }),
    [
      computePriceForProperty,
      createOverride,
      createRule,
      deleteOverride,
      deleteRule,
      error,
      loading,
      overrides,
      properties,
      refresh,
      rules,
      toggleRuleActive,
      updatePropertyBaseRate,
      updateRule,
    ],
  );

  return result;
}
