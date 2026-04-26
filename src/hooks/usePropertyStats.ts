import { useCallback, useEffect, useState } from 'react';
import { fr } from '../lib/i18n/fr';
import { computeAllPropertyStats, computePortfolioSummary } from '../lib/property-stats-logic';
import { supabase, type Property, type Reservation } from '../lib/supabase';
import type { HousekeepingTask } from '../types/housekeeping';
import type { MaintenanceTicket } from '../types/maintenance';
import type { PropertyStats, PropertyStatsSummary } from '../types/property-stats';

const EMPTY_SUMMARY: PropertyStatsSummary = {
  totalProperties: 0,
  totalRevenueThisMonth: 0,
  avgOccupancyRate: 0,
  totalPendingTasks: 0,
  totalUrgentTickets: 0,
};

interface ErrorLike {
  message?: string;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as ErrorLike).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }

  return fr.errors.generic;
}

export interface PropertyStatsData {
  properties: Property[];
  allStats: PropertyStats[];
  summary: PropertyStatsSummary;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function usePropertyStats(hostId: string): PropertyStatsData {
  const [properties, setProperties] = useState<Property[]>([]);
  const [allStats, setAllStats] = useState<PropertyStats[]>([]);
  const [summary, setSummary] = useState<PropertyStatsSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!hostId) {
      setProperties([]);
      setAllStats([]);
      setSummary(EMPTY_SUMMARY);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('host_id', hostId)
        .order('name', { ascending: true });

      if (propertiesError) {
        throw propertiesError;
      }

      const propertyRows = (propertiesData ?? []) as Property[];
      setProperties(propertyRows);

      if (propertyRows.length === 0) {
        setAllStats([]);
        setSummary(EMPTY_SUMMARY);
        setError(null);
        return;
      }

      const propertyIds = propertyRows.map((property) => property.id);

      const [reservationsResult, tasksResult, ticketsResult] = await Promise.all([
        supabase
          .from('reservations')
          .select('*')
          .in('property_id', propertyIds),
        supabase
          .from('housekeeping_tasks')
          .select('*')
          .eq('host_id', hostId)
          .in('property_id', propertyIds),
        supabase
          .from('maintenance_tickets')
          .select('*')
          .eq('host_id', hostId)
          .in('property_id', propertyIds),
      ]);

      if (reservationsResult.error) throw reservationsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      if (ticketsResult.error) throw ticketsResult.error;

      const reservations = (reservationsResult.data ?? []) as Reservation[];
      const tasks = (tasksResult.data ?? []) as HousekeepingTask[];
      const tickets = (ticketsResult.data ?? []) as MaintenanceTicket[];
      const nextStats = computeAllPropertyStats(propertyRows, reservations, tasks, tickets);

      setAllStats(nextStats);
      setSummary(computePortfolioSummary(nextStats));
      setError(null);
    } catch (fetchError) {
      console.error('[usePropertyStats] Failed to load property stats:', fetchError);
      setProperties([]);
      setAllStats([]);
      setSummary(EMPTY_SUMMARY);
      setError(toErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    void fetchData();
  }, [fetchData]);

  return {
    properties,
    allStats,
    summary,
    loading,
    error,
    refresh,
  };
}
