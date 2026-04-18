import { useState, useEffect } from 'react';
import { supabase, Property, PropertyCreateInput } from '../lib/supabase';

export function useProperties(hostId: string | null) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hostId) {
      fetchProperties();
    }
  }, [hostId]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('host_id', hostId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } finally {
      setLoading(false);
    }
  };

  const addProperty = async (property: PropertyCreateInput) => {
    const { data, error } = await supabase
      .from('properties')
      .insert([{ ...property, host_id: hostId }])
      .select();

    if (error) throw error;

    if (data) {
      setProperties((prev) => [data[0], ...prev]);
    }
    return data?.[0];
  };

  const updateProperty = async (id: string, updates: Partial<Property>) => {
    const { error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const deleteProperty = async (id: string) => {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) throw error;

    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  return { properties, loading, addProperty, updateProperty, deleteProperty };
}
