import { useState, useEffect } from 'react';
import { supabase, Host } from '../lib/supabase';

export function useHost(userId: string | null) {
  const [host, setHost] = useState<Host | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchHost();
    }
  }, [userId]);

  const fetchHost = async () => {
    try {
      const { data, error } = await supabase
        .from('hosts')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setHost(data);
    } finally {
      setLoading(false);
    }
  };

  const updateHost = async (updates: Partial<Host>) => {
    const { error } = await supabase
      .from('hosts')
      .update(updates)
      .eq('id', userId);

    if (error) {
      throw error;
    }

    setHost((prev) => prev ? { ...prev, ...updates } : null);
  };

  return { host, loading, updateHost };
}
