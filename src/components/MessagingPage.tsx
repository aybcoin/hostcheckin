import { MessageSquareText, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useMessageTemplates } from '../hooks/useMessageTemplates';
import { clsx } from '../lib/clsx';
import {
  borderTokens,
  chipTokens,
  inputTokens,
  statusTokens,
  textTokens,
} from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { toast } from '../lib/toast';
import type { AutomationTrigger } from '../types/automations';
import type { MessageChannel, MessageLocale, MessageTemplate } from '../types/messaging';
import { CreateTemplateModal } from './messaging/CreateTemplateModal';
import { EditTemplateModal } from './messaging/EditTemplateModal';
import { SeedDefaultsModal } from './messaging/SeedDefaultsModal';
import { TemplateCard } from './messaging/TemplateCard';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';
import { Skeleton } from './ui/Skeleton';

interface MessagingPageProps {
  hostId: string;
}

type TriggerFilter = AutomationTrigger | 'all';
type LocaleFilter = MessageLocale | 'all';
type ChannelFilter = MessageChannel | 'all';

function topKey<T extends string>(entries: Record<T, number>): T | null {
  let bestKey: T | null = null;
  let bestCount = 0;

  for (const key in entries) {
    const count = entries[key];
    if (count <= bestCount) continue;
    /**
     * `key` provient d'une itération sur `Record<T, number>`.
     * On le ré-associe à `T` pour conserver le type d'index des dictionnaires i18n.
     */
    bestKey = key as T;
    bestCount = count;
  }

  return bestKey;
}

function SummaryCard({
  label,
  value,
  helper,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: 'neutral' | 'warning';
}) {
  return (
    <Card variant="default" padding="sm" className="space-y-1">
      <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>{label}</p>
      <p className={clsx('text-2xl font-semibold', tone === 'warning' ? textTokens.warning : textTokens.title)}>
        {value}
      </p>
      {helper ? <p className={clsx('text-xs', textTokens.muted)}>{helper}</p> : null}
    </Card>
  );
}

export function MessagingPage({ hostId }: MessagingPageProps) {
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>('all');
  const [localeFilter, setLocaleFilter] = useState<LocaleFilter>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isSeedOpen, setIsSeedOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const {
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
  } = useMessageTemplates(hostId);

  const filteredTemplates = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return templates
      .filter((template) => (triggerFilter === 'all' ? true : template.trigger === triggerFilter))
      .filter((template) => (localeFilter === 'all' ? true : template.locale === localeFilter))
      .filter((template) => (channelFilter === 'all' ? true : template.channel === channelFilter))
      .filter((template) => {
        if (!searchTerm) return true;
        const haystack = [
          template.subject,
          template.body,
          template.notes,
          fr.automations.triggers[template.trigger],
          fr.messaging.channels[template.channel],
          fr.messaging.locales[template.locale],
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchTerm);
      })
      .sort((left, right) => {
        if (left.is_default !== right.is_default) return left.is_default ? -1 : 1;
        if (left.is_active !== right.is_active) return left.is_active ? -1 : 1;
        return left.created_at.localeCompare(right.created_at) * -1;
      });
  }, [channelFilter, localeFilter, search, templates, triggerFilter]);

  const topTrigger = topKey(summary.byTrigger);
  const topLocale = topKey(summary.byLocale);

  const handleCreate = async (input: Parameters<typeof createTemplate>[0]) => {
    const result = await createTemplate(input);

    if (result.error) {
      toast.error(fr.messaging.createError);
      return { error: result.error };
    }

    toast.success(fr.messaging.created);
    return { error: null };
  };

  const handleUpdate = async (id: string, patch: Parameters<typeof updateTemplate>[1]) => {
    const result = await updateTemplate(id, patch);

    if (result.error) {
      toast.error(fr.messaging.updateError);
      return { error: result.error };
    }

    toast.success(fr.messaging.updated);
    return { error: null };
  };

  const handleDelete = async (template: MessageTemplate) => {
    if (typeof window !== 'undefined' && !window.confirm(fr.messaging.confirmDelete)) {
      return;
    }

    const result = await deleteTemplate(template.id);
    if (result.error) {
      toast.error(fr.messaging.deleteError);
      return;
    }

    toast.info(fr.messaging.deleted);
  };

  const handleSetDefault = async (template: MessageTemplate) => {
    const result = await setAsDefault(template.id);
    if (result.error) {
      toast.error(fr.messaging.updateError);
      return;
    }

    toast.success(fr.messaging.updated);
  };

  const handleSeedDefaults = async () => {
    setIsSeeding(true);

    try {
      const result = await seedDefaults();
      if (result.error) {
        toast.error(fr.messaging.seedError);
        return;
      }

      toast.success(fr.messaging.seeded);
      setIsSeedOpen(false);
    } finally {
      setIsSeeding(false);
    }
  };

  const isEmpty = !loading && !error && templates.length === 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={clsx('text-2xl font-semibold', textTokens.title)}>{fr.messaging.pageTitle}</h1>
          <p className={clsx('mt-1 max-w-2xl text-sm', textTokens.muted)}>{fr.messaging.pageSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refresh}>
            <RefreshCw aria-hidden size={14} />
            {fr.messaging.refresh}
          </Button>
          {templates.length === 0 ? (
            <Button variant="secondary" size="sm" onClick={() => setIsSeedOpen(true)}>
              {fr.messaging.seedDefaults}
            </Button>
          ) : null}
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden size={14} />
            {fr.messaging.addTemplate}
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <SummaryCard
          label={fr.messaging.summary.total}
          value={String(summary.total)}
        />
        <SummaryCard
          label={fr.messaging.summary.active}
          value={String(summary.active)}
        />
        <SummaryCard
          label={fr.messaging.summary.topTrigger}
          value={topTrigger ? fr.automations.triggers[topTrigger] : fr.messaging.summary.emptyValue}
        />
        <SummaryCard
          label={fr.messaging.summary.topLocale}
          value={topLocale ? fr.messaging.locales[topLocale] : fr.messaging.summary.emptyValue}
        />
        <SummaryCard
          label={fr.messaging.summary.missingDefaults}
          value={String(summary.missingDefaults.length)}
          helper={
            summary.missingDefaults.length > 0
              ? fr.messaging.summary.missingDefaultsHelper
              : undefined
          }
          tone={summary.missingDefaults.length > 0 ? 'warning' : 'neutral'}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'all', label: fr.messaging.filters.triggerAll },
            { id: 'checkin_reminder_j1', label: fr.automations.triggers.checkin_reminder_j1 },
            { id: 'checkin_day', label: fr.automations.triggers.checkin_day },
            { id: 'checkout_reminder', label: fr.automations.triggers.checkout_reminder },
            { id: 'contract_signed', label: fr.automations.triggers.contract_signed },
            { id: 'verification_complete', label: fr.automations.triggers.verification_complete },
          ] as Array<{ id: TriggerFilter; label: string }>).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTriggerFilter(item.id)}
              className={clsx(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                triggerFilter === item.id ? chipTokens.active : chipTokens.primary,
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className={clsx('flex flex-wrap items-center gap-2 rounded-xl border p-3', borderTokens.default)}>
          {([
            { id: 'all', label: fr.messaging.filters.localeAll },
            { id: 'fr', label: fr.messaging.locales.fr },
            { id: 'en', label: fr.messaging.locales.en },
            { id: 'ar', label: fr.messaging.locales.ar },
            { id: 'darija', label: fr.messaging.locales.darija },
          ] as Array<{ id: LocaleFilter; label: string }>).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLocaleFilter(item.id)}
              className={clsx(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                localeFilter === item.id ? chipTokens.active : chipTokens.primary,
              )}
            >
              {item.label}
            </button>
          ))}

          {([
            { id: 'all', label: fr.messaging.filters.channelAll },
            { id: 'email', label: fr.messaging.channels.email },
            { id: 'sms', label: fr.messaging.channels.sms },
          ] as Array<{ id: ChannelFilter; label: string }>).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setChannelFilter(item.id)}
              className={clsx(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                channelFilter === item.id ? chipTokens.active : chipTokens.primary,
              )}
            >
              {item.label}
            </button>
          ))}

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={fr.messaging.filters.searchPlaceholder}
            className={clsx(inputTokens.base, 'ml-auto w-72 max-w-full py-1.5 text-xs')}
            aria-label={fr.messaging.filters.searchPlaceholder}
          />
        </div>
      </section>

      {error ? (
        <div className={clsx('rounded-lg border px-4 py-3 text-sm', statusTokens.danger)}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} height={92} />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} height={220} />
            ))}
          </div>
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={<MessageSquareText size={20} />}
          title={fr.messaging.empty.title}
          description={fr.messaging.empty.description}
          action={(
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" size="sm" onClick={() => setIsSeedOpen(true)}>
                {fr.messaging.empty.seedCta}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(true)}>
                {fr.messaging.empty.createCta}
              </Button>
            </div>
          )}
        />
      ) : filteredTemplates.length === 0 ? (
        <Card variant="default" padding="lg" className="text-center">
          <p className={clsx('text-sm', textTokens.muted)}>{fr.messaging.empty.filtered}</p>
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={setEditingTemplate}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          ))}
        </section>
      )}

      <CreateTemplateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <EditTemplateModal
        isOpen={editingTemplate !== null}
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
        onSubmit={handleUpdate}
      />

      <SeedDefaultsModal
        isOpen={isSeedOpen}
        loading={isSeeding}
        onClose={() => setIsSeedOpen(false)}
        onConfirm={() => {
          void handleSeedDefaults();
        }}
      />
    </div>
  );
}
