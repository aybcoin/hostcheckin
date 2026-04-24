import { useCallback, useEffect, useState } from 'react';
import { Property, PropertyCreateInput, supabase } from '../lib/supabase';

export function useProperties(hostId: string | null) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = useCallback(async (showLoader: boolean = true) => {
    if (!hostId) {
      setProperties([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (showLoader) {
      setLoading(true);
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('host_id', hostId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setProperties(data || []);
      setError(null);
    } catch (fetchError) {
      console.error('[useProperties] Failed to load properties:', fetchError);
      setError('Impossible de charger les logements.');
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [hostId]);

  useEffect(() => {
    void fetchProperties(true);
  }, [fetchProperties]);

  const refresh = useCallback(() => {
    void fetchProperties(true);
  }, [fetchProperties]);

  const addProperty = async (property: PropertyCreateInput) => {
    const { data, error: insertError } = await supabase
      .from('properties')
      .insert([{ ...property, host_id: hostId }])
      .select();

    if (insertError) throw insertError;

    if (data) {
      setProperties((prev) => [data[0], ...prev]);
    }
    return data?.[0];
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    const { error: updateError } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    setProperties((prev) =>
      prev.map((property) => (property.id === id ? { ...property, ...updates } : property))
    );
  };

  const deleteProperty = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    setProperties((prev) => prev.filter((property) => property.id !== id));
  };

  return { properties, loading, error, refresh, addProperty, updateProperty, deleteProperty };
}
