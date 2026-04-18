import { useState, useEffect } from 'react';
import { supabase, Reservation } from '../lib/supabase';

export function useReservations(propertyId?: string | null) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReservations();
  }, [propertyId]);

  const fetchReservations = async () => {
    try {
      let query = supabase.from('reservations').select('*');

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query.order('check_in_date', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } finally {
      setLoading(false);
    }
  };

  const generateUniqueLink = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const addReservation = async (reservation: Omit<Reservation, 'id' | 'unique_link' | 'created_at' | 'updated_at'>) => {
    const uniqueLink = generateUniqueLink();

    const { data, error } = await supabase
      .from('reservations')
      .insert([{ ...reservation, unique_link: uniqueLink }])
      .select();

    if (error) {
      console.error('Supabase error (reservations.insert):', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    } else if (data) {
      setReservations((prev) => [data[0], ...prev]);
    }
    return { data, error };
  };

  const updateReservation = async (id: string, updates: Partial<Reservation>) => {
    const { error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setReservations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
    }
    return { error };
  };

  const deleteReservation = async (id: string) => {
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);

    if (!error) {
      setReservations((prev) => prev.filter((r) => r.id !== id));
    }
    return { error };
  };

  return { reservations, loading, addReservation, updateReservation, deleteReservation, refetch: fetchReservations };
}
