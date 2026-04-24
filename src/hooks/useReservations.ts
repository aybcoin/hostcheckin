import { useCallback, useEffect, useState } from 'react';
import { fr } from '../lib/i18n/fr';
import { Reservation, ReservationCreateInput, supabase } from '../lib/supabase';

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

  const addReservation = async (reservation: ReservationCreateInput) => {
    const uniqueLink = generateUniqueLink();
    const verificationMode = reservation.verification_mode || reservation.verification_type || 'simple';

    const { data, error: insertError } = await supabase
      .from('reservations')
      .insert([{
        ...reservation,
        verification_mode: verificationMode,
        verification_type: reservation.verification_type || verificationMode,
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
