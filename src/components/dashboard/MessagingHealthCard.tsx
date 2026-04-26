import { MessageSquareText } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { useMessageTemplates } from '../../hooks/useMessageTemplates';
import { displayTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { MessageLocale } from '../../types/messaging';
import { StatusBadge } from '../ui/StatusBadge';
import { DashboardWidgetCard } from './DashboardWidgetCard';

interface MessagingHealthCardProps {
  hostId: string;
  onSeeAll: () => void;
}

function topLocaleKey(byLocale: Record<MessageLocale, number>): MessageLocale | null {
  const sorted = Object.entries(byLocale).sort((left, right) => right[1] - left[1]);
  const [key, count] = sorted[0] ?? [];
  if (!key || !count) return null;
  return key as MessageLocale;
}

export function MessagingHealthCard({ hostId, onSeeAll }: MessagingHealthCardProps) {
  const {
    templates,
    summary,
    loading,
    error,
    refresh,
  } = useMessageTemplates(hostId);
  const topLocale = topLocaleKey(summary.byLocale);
  const hasContent = summary.active > 0 || templates.length > 0;

  return (
    <DashboardWidgetCard
      title={fr.dashboardMessaging.cardTitle}
      icon={MessageSquareText}
      seeAllLabel={fr.dashboardMessaging.cardSeeAll}
      onSeeAll={onSeeAll}
      loading={loading}
      error={error}
      onRetry={refresh}
      errorDescription={fr.errors.genericDescription}
      isEmpty={!hasContent}
      emptyFallback={<p className={clsx('text-sm', textTokens.muted)}>{fr.dashboardMessaging.cardEmpty}</p>}
    >
      <div className="space-y-1">
        <p className={clsx('text-xs uppercase tracking-wide', textTokens.subtle)}>
          {fr.dashboardMessaging.activeTemplates}
        </p>
        <p className={clsx('text-2xl', displayTokens.number, textTokens.title)}>{summary.active}</p>
        <p className={clsx('text-sm', textTokens.muted)}>
          {topLocale ? fr.messaging.locales[topLocale] : '—'} · {fr.dashboardMessaging.missingDefaults}: {summary.missingDefaults.length}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatusBadge variant="info">{fr.dashboardMessaging.activeTemplates}: {summary.active}</StatusBadge>
        <StatusBadge variant={summary.missingDefaults.length > 0 ? 'warning' : 'neutral'}>
          {fr.dashboardMessaging.missingDefaults}: {summary.missingDefaults.length}
        </StatusBadge>
        <StatusBadge variant="neutral">{fr.dashboardMessaging.topLocale}: {topLocale ? fr.messaging.locales[topLocale] : '—'}</StatusBadge>
      </div>
    </DashboardWidgetCard>
  );
}
