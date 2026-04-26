import { useCallback, useEffect, useMemo, useState } from 'react';
import { summarizeTemplates } from '../lib/messaging-logic';
import { fr } from '../lib/i18n/fr';
import { supabase } from '../lib/supabase';
import type {
  MessageTemplate,
  MessageTemplateCreateInput,
  MessageTemplateSummary,
  MessageTemplateUpdateInput,
} from '../types/messaging';
import { defaultTemplatesFor } from '../lib/messaging-logic';

interface SupabaseErrorLike {
  message: string;
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

export interface UseMessageTemplatesResult {
  templates: MessageTemplate[];
  summary: MessageTemplateSummary;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  createTemplate: (
    input: MessageTemplateCreateInput,
  ) => Promise<{ data: MessageTemplate | null; error: Error | null }>;
  updateTemplate: (
    id: string,
    patch: MessageTemplateUpdateInput,
  ) => Promise<{ error: Error | null }>;
  deleteTemplate: (id: string) => Promise<{ error: Error | null }>;
  setAsDefault: (id: string) => Promise<{ error: Error | null }>;
  seedDefaults: () => Promise<{ created: number; error: Error | null }>;
}

export function useMessageTemplates(hostId: string | null): UseMessageTemplatesResult {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(
    async (showLoader: boolean = true) => {
      if (!hostId) {
        setTemplates([]);
        setError(null);
        setLoading(false);
        return;
      }

      if (showLoader) setLoading(true);

      try {
        const { data, error: fetchError } = await supabase
          .from('message_templates')
          .select('*')
          .eq('host_id', hostId)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setTemplates((data ?? []) as MessageTemplate[]);
        setError(null);
      } catch (fetchError) {
        console.error('[useMessageTemplates] Failed to load templates:', fetchError);
        setTemplates([]);
        setError(fr.messaging.loadError);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [hostId],
  );

  useEffect(() => {
    void fetchTemplates(true);
  }, [fetchTemplates]);

  useEffect(() => {
    if (!hostId) return;

    const channel = supabase
      .channel(`message-templates-live-${hostId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_templates',
          filter: `host_id=eq.${hostId}`,
        },
        () => {
          void fetchTemplates(false);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchTemplates, hostId]);

  const refresh = useCallback(() => {
    void fetchTemplates(true);
  }, [fetchTemplates]);

  const createTemplate = useCallback<UseMessageTemplatesResult['createTemplate']>(
    async (input) => {
      if (!hostId) return { data: null, error: new Error('Missing hostId') };

      const shouldSetDefault = input.is_default === true;
      const payload = {
        host_id: hostId,
        trigger: input.trigger,
        channel: input.channel,
        locale: input.locale,
        subject: input.channel === 'sms' ? null : input.subject?.trim() || null,
        body: input.body.trim(),
        is_active: input.is_active ?? true,
        is_default: shouldSetDefault ? false : (input.is_default ?? false),
        notes: input.notes?.trim() || null,
      };

      const { data, error: insertError } = await supabase
        .from('message_templates')
        .insert([payload])
        .select('*')
        .single();

      if (insertError) {
        return { data: null, error: toError(insertError) };
      }

      if (shouldSetDefault) {
        const { error: defaultError } = await supabase.rpc('set_message_template_default', {
          p_template_id: data.id,
          p_host_id: hostId,
        });

        if (defaultError) {
          return { data: data as MessageTemplate, error: toError(defaultError) };
        }
      }

      await fetchTemplates(false);
      return { data: data as MessageTemplate, error: null };
    },
    [fetchTemplates, hostId],
  );

  const updateTemplate = useCallback<UseMessageTemplatesResult['updateTemplate']>(
    async (id, patch) => {
      if (!hostId) return { error: new Error('Missing hostId') };

      const currentTemplate = templates.find((template) => template.id === id) ?? null;
      const shouldReapplyDefault = Boolean(
        patch.is_default === true
        || (currentTemplate?.is_default && (patch.trigger || patch.channel || patch.locale)),
      );

      const updatePayload = {
        ...(patch.trigger ? { trigger: patch.trigger } : {}),
        ...(patch.channel ? { channel: patch.channel } : {}),
        ...(patch.locale ? { locale: patch.locale } : {}),
        ...(patch.subject !== undefined
          ? { subject: (patch.channel ?? currentTemplate?.channel) === 'sms' ? null : patch.subject?.trim() || null }
          : {}),
        ...(patch.body !== undefined ? { body: patch.body.trim() } : {}),
        ...(patch.is_active !== undefined ? { is_active: patch.is_active } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
        ...(patch.is_default !== undefined || shouldReapplyDefault
          ? { is_default: shouldReapplyDefault ? false : patch.is_default }
          : {}),
      };

      const { error: updateError } = await supabase
        .from('message_templates')
        .update(updatePayload)
        .eq('id', id)
        .eq('host_id', hostId);

      if (updateError) {
        return { error: toError(updateError) };
      }

      if (shouldReapplyDefault) {
        const { error: defaultError } = await supabase.rpc('set_message_template_default', {
          p_template_id: id,
          p_host_id: hostId,
        });

        if (defaultError) {
          return { error: toError(defaultError) };
        }
      }

      await fetchTemplates(false);
      return { error: null };
    },
    [fetchTemplates, hostId, templates],
  );

  const deleteTemplate = useCallback<UseMessageTemplatesResult['deleteTemplate']>(
    async (id) => {
      if (!hostId) return { error: new Error('Missing hostId') };

      const { error: deleteError } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id)
        .eq('host_id', hostId);

      if (deleteError) {
        return { error: toError(deleteError) };
      }

      await fetchTemplates(false);
      return { error: null };
    },
    [fetchTemplates, hostId],
  );

  const setAsDefault = useCallback<UseMessageTemplatesResult['setAsDefault']>(
    async (id) => {
      if (!hostId) return { error: new Error('Missing hostId') };

      const { error: rpcError } = await supabase.rpc('set_message_template_default', {
        p_template_id: id,
        p_host_id: hostId,
      });

      if (rpcError) {
        return { error: toError(rpcError) };
      }

      await fetchTemplates(false);
      return { error: null };
    },
    [fetchTemplates, hostId],
  );

  const seedDefaults = useCallback<UseMessageTemplatesResult['seedDefaults']>(
    async () => {
      if (!hostId) return { created: 0, error: new Error('Missing hostId') };

      const { count, error: countError } = await supabase
        .from('message_templates')
        .select('id', { count: 'exact', head: true })
        .eq('host_id', hostId);

      if (countError) {
        return { created: 0, error: toError(countError) };
      }

      if ((count ?? 0) > 0) {
        return { created: 0, error: null };
      }

      const defaults = defaultTemplatesFor(hostId);
      const { error: insertError } = await supabase
        .from('message_templates')
        .insert(defaults);

      if (insertError) {
        return { created: 0, error: toError(insertError) };
      }

      await fetchTemplates(false);
      return { created: defaults.length, error: null };
    },
    [fetchTemplates, hostId],
  );

  const summary = useMemo(() => summarizeTemplates(templates), [templates]);

  return {
    templates,
    summary,
    loading,
    error,
    refresh,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setAsDefault,
    seedDefaults,
  };
}
