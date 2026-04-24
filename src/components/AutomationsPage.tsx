import { BellRing, MessageSquareWarning } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAutomations } from '../hooks/useAutomations';
import { clsx } from '../lib/clsx';
import { borderTokens, statusTokens, textTokens } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { toast } from '../lib/toast';
import type {
  AutomationRule,
  AutomationTrigger,
  NotificationChannel,
  NotificationLog,
} from '../types/automations';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { EmptyState } from './ui/EmptyState';

const t = fr.automations;

const channelVariantByType: Record<NotificationChannel, 'info' | 'warning' | 'success'> = {
  email: 'info',
  sms: 'warning',
  both: 'success',
};

const recipientLabelByType: Record<AutomationRule['recipientType'], string> = {
  host: 'Hôte',
  guest: 'Invité',
  both: 'Hôte + invité',
};

const triggerDescriptionByType: Record<AutomationTrigger, string> = {
  checkin_reminder_j1:
    'Notification envoyée la veille de l’arrivée pour rappeler les informations de check-in.',
  checkin_day:
    'Notification envoyée le jour de l’arrivée pour accueillir l’invité.',
  checkout_reminder:
    'Notification envoyée la veille du départ pour préparer le check-out.',
  contract_signed:
    'Notification envoyée quand le contrat de séjour est signé.',
  verification_complete:
    'Notification envoyée à l’hôte quand l’identité du voyageur est validée.',
};

const statusClassByType: Record<NotificationLog['status'], string> = {
  sent: statusTokens.success,
  failed: statusTokens.danger,
  pending: statusTokens.warning,
  skipped: statusTokens.neutral,
};

function formatDate(value: string | null): string {
  if (!value) return '—';

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AutomationsPage() {
  const { rules, logs, isLoading, toggleRule, sendTestNotification, isSending } = useAutomations();
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);

  const hasBrevoProvider = Boolean(import.meta.env.VITE_BREVO_API_KEY || import.meta.env.BREVO_API_KEY);

  const sortedRules = useMemo(
    () => [...rules].sort((first, second) => first.trigger.localeCompare(second.trigger)),
    [rules],
  );

  const handleToggleRule = async (ruleId: string) => {
    await toggleRule(ruleId);
  };

  const handleSendTest = async (rule: AutomationRule) => {
    setTestingRuleId(rule.id);

    try {
      await sendTestNotification(rule.trigger, rule.channel);
      toast.success(fr.toast.notificationSent);
    } catch {
      toast.error(fr.toast.notificationError);
    } finally {
      setTestingRuleId(null);
    }
  };

  return (
    <div role="main" className="space-y-6">
      <header>
        <h1 className={clsx('text-2xl sm:text-3xl font-bold', textTokens.title)}>{t.pageTitle}</h1>
        <p className={clsx('mt-1', textTokens.muted)}>{t.pageDescription}</p>
      </header>

      <section role="region" aria-label={t.rulesTitle} className="space-y-4">
        <h2 className={clsx('text-lg font-semibold', textTokens.title)}>{t.rulesTitle}</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sortedRules.map((rule) => (
            <Card key={rule.id} variant="default" padding="md" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={clsx('text-base font-semibold', textTokens.title)}>{t.triggers[rule.trigger]}</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={channelVariantByType[rule.channel]}>{t.channels[rule.channel]}</Badge>
                  <Badge variant="neutral">{recipientLabelByType[rule.recipientType]}</Badge>
                </div>
              </div>

              <p className={clsx('text-sm', textTokens.body)}>{triggerDescriptionByType[rule.trigger]}</p>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className={clsx('inline-flex items-center gap-2 text-sm', textTokens.body)}>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={rule.enabled}
                    onChange={() => {
                      void handleToggleRule(rule.id);
                    }}
                    aria-label={`${rule.enabled ? t.actions.disable : t.actions.enable} ${t.triggers[rule.trigger]}`}
                    className={clsx('h-4 w-7 rounded-full border', borderTokens.default)}
                  />
                  <span>{rule.enabled ? t.actions.disable : t.actions.enable}</span>
                </label>

                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isSending || !rule.enabled}
                  onClick={() => {
                    void handleSendTest(rule);
                  }}
                >
                  {isSending && testingRuleId === rule.id ? t.actions.testing : t.actions.test}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section role="region" aria-label={t.logsTitle} className="space-y-4">
        <h2 className={clsx('text-lg font-semibold', textTokens.title)}>{t.logsTitle}</h2>
        <Card variant="default" padding="md" aria-live="polite">
          {isLoading ? (
            <p className={textTokens.muted}>{fr.common.loading}</p>
          ) : logs.length === 0 ? (
            <EmptyState
              icon={<BellRing className={textTokens.subtle} aria-hidden="true" />}
              title={t.empty.logsTitle}
              description={t.empty.logsDescription}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className={clsx('min-w-full text-sm', textTokens.body)}>
                <thead className={clsx('text-left text-xs uppercase', textTokens.muted)}>
                  <tr className={clsx('border-b', borderTokens.default)}>
                    <th className="px-2 py-3">Date</th>
                    <th className="px-2 py-3">Déclencheur</th>
                    <th className="px-2 py-3">Canal</th>
                    <th className="px-2 py-3">Destinataire</th>
                    <th className="px-2 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className={clsx('border-b', borderTokens.subtle)}>
                      <td className="px-2 py-3 align-top">{formatDate(log.sentAt)}</td>
                      <td className="px-2 py-3 align-top">{t.triggers[log.trigger]}</td>
                      <td className="px-2 py-3 align-top">{t.channels[log.channel]}</td>
                      <td className="px-2 py-3 align-top">{log.recipient}</td>
                      <td className="px-2 py-3 align-top">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                            statusClassByType[log.status],
                          )}
                        >
                          {t.status[log.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section role="region" aria-label={t.providerTitle} className="space-y-4">
        <h2 className={clsx('text-lg font-semibold', textTokens.title)}>{t.providerTitle}</h2>
        <div className="space-y-3">
          {!hasBrevoProvider ? (
            <Card variant="warning" padding="md" className="flex items-start gap-3">
              <MessageSquareWarning
                className={clsx('mt-0.5 h-5 w-5 shrink-0', textTokens.warning)}
                aria-hidden="true"
              />
              <p className={clsx('text-sm', textTokens.body)}>
                Notifications non configurées. Créez un compte gratuit sur brevo.com, copiez votre API key et
                ajoutez-la dans vos variables d&apos;environnement Supabase sous le nom <code>BREVO_API_KEY</code>.
              </p>
            </Card>
          ) : null}

          {hasBrevoProvider ? (
            <Card variant="info" padding="md">
              <p className={clsx('text-sm', textTokens.body)}>Provider Brevo configuré.</p>
            </Card>
          ) : null}

          <a
            href="https://app.brevo.com/settings/keys/api"
            target="_blank"
            rel="noopener noreferrer"
            className={clsx('text-sm underline underline-offset-2', textTokens.info)}
          >
            Ouvrir les API keys Brevo
          </a>

          <a
            href="https://supabase.com/docs/guides/functions/secrets"
            target="_blank"
            rel="noreferrer"
            className={clsx('text-sm underline underline-offset-2', textTokens.info)}
          >
            Documentation Supabase Edge Functions - variables d&apos;environnement
          </a>
        </div>
      </section>
    </div>
  );
}
