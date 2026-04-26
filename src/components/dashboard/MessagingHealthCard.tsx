import { ArrowRight, MessageSquareText } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { useMessageTemplates } from '../../hooks/useMessageTemplates';
import { borderTokens, statusTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { MessageLocale } from '../../types/messaging';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

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
  const { templates, summary, loading } = useMessageTemplates(hostId);
  const topLocale = topLocaleKey(summary.byLocale);
  const hasContent = summary.active > 0 || templates.length > 0;

  return (
    <Card variant="default" padding="md" className={clsx('space-y-3', borderTokens.default)}>
      <header className="flex items-center justify-between gap-2">
        <h2 className={clsx('flex items-center gap-2 text-base font-semibold', textTokens.title)}>
          <MessageSquareText aria-hidden size={16} />
          {fr.dashboardMessaging.cardTitle}
        </h2>
        <Button variant="tertiary" size="sm" onClick={onSeeAll}>
          {fr.dashboardMessaging.cardSeeAll}
          <ArrowRight aria-hidden size={14} />
        </Button>
      </header>

      {loading ? (
        <div className="space-y-2" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="text" className="h-4 w-full" />
          ))}
        </div>
      ) : !hasContent ? (
        <p className={clsx('text-sm', textTokens.muted)}>{fr.dashboardMessaging.cardEmpty}</p>
      ) : (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.info)}>
            {fr.dashboardMessaging.activeTemplates}: <strong>{summary.active}</strong>
          </span>
          <span
            className={clsx(
              'rounded-full border px-2 py-0.5',
              summary.missingDefaults.length > 0 ? statusTokens.warning : statusTokens.neutral,
            )}
          >
            {fr.dashboardMessaging.missingDefaults}: <strong>{summary.missingDefaults.length}</strong>
          </span>
          <span className={clsx('rounded-full border px-2 py-0.5', statusTokens.neutral)}>
            {fr.dashboardMessaging.topLocale}: <strong>{topLocale ? fr.messaging.locales[topLocale] : '—'}</strong>
          </span>
        </div>
      )}
    </Card>
  );
}
