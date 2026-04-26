import { PencilLine, Star, Trash2 } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import { borderTokens, textTokens } from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import type { MessageTemplate } from '../../types/messaging';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';
import { LocaleFlag } from './LocaleFlag';

interface TemplateCardProps {
  template: MessageTemplate;
  onEdit: (template: MessageTemplate) => void;
  onDelete: (template: MessageTemplate) => void;
  onSetDefault: (template: MessageTemplate) => void;
}

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  onSetDefault,
}: TemplateCardProps) {
  return (
    <Card
      variant="default"
      padding="md"
      className="space-y-4"
      data-testid={`message-template-${template.id}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className={clsx('text-base font-semibold', textTokens.title)}>
            {fr.automations.triggers[template.trigger]}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={template.channel === 'email' ? 'info' : 'warning'}>
              {fr.messaging.channels[template.channel]}
            </StatusBadge>
            <LocaleFlag locale={template.locale} showLabel />
            <StatusBadge variant={template.is_active ? 'success' : 'neutral'}>
              {template.is_active ? fr.messaging.templateCard.active : fr.messaging.templateCard.inactive}
            </StatusBadge>
            {template.is_default ? (
              <StatusBadge variant="info">{fr.messaging.templateCard.isDefault}</StatusBadge>
            ) : null}
          </div>
        </div>
      </header>

      <div className={clsx('space-y-3 rounded-xl border p-3', borderTokens.default)}>
        {template.channel === 'email' ? (
          <div className="space-y-1">
            <p className={clsx('text-xs font-medium uppercase tracking-wide', textTokens.subtle)}>
              {fr.messaging.templateCard.subjectLabel}
            </p>
            <p className={clsx('line-clamp-1 text-sm', textTokens.body)}>
              {template.subject || '—'}
            </p>
          </div>
        ) : null}

        <div className="space-y-1">
          <p className={clsx('text-xs font-medium uppercase tracking-wide', textTokens.subtle)}>
            {fr.messaging.templateCard.bodyLabel}
          </p>
          <p className={clsx('line-clamp-2 whitespace-pre-line text-sm', textTokens.body)}>
            {template.body}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onEdit(template)}>
          <PencilLine aria-hidden size={14} />
          {fr.messaging.templateCard.edit}
        </Button>
        <Button variant="dangerSoft" size="sm" onClick={() => onDelete(template)}>
          <Trash2 aria-hidden size={14} />
          {fr.messaging.templateCard.delete}
        </Button>
        {!template.is_default ? (
          <Button variant="tertiary" size="sm" onClick={() => onSetDefault(template)}>
            <Star aria-hidden size={14} />
            {fr.messaging.templateCard.setDefault}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
