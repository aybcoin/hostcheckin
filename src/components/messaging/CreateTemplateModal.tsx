import { type FormEvent, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  iconButtonToken,
  modalTokens,
  statusTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { MESSAGE_VARIABLES, validateTemplate } from '../../lib/messaging-logic';
import type { MessageTemplateCreateInput } from '../../types/messaging';
import { Button } from '../ui/Button';
import { TemplateEditor, type TemplateFormValues } from './TemplateEditor';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: MessageTemplateCreateInput) => Promise<{ error: Error | null } | void>;
}

function buildInitialValue(): TemplateFormValues {
  return {
    trigger: 'checkin_reminder_j1',
    channel: 'email',
    locale: 'fr',
    subject: '',
    body: '',
    is_active: true,
    notes: '',
  };
}

function resolveValidationMessage(errorKey: string | null): string | null {
  if (!errorKey) return null;

  if (errorKey.startsWith('unknownVariable:')) {
    return fr.messaging.validation.unknownVariable(errorKey.split(':')[1] ?? '');
  }

  if (errorKey === 'emailMissingSubject') {
    return fr.messaging.validation.emailMissingSubject;
  }

  if (errorKey === 'bodyEmpty') {
    return fr.messaging.validation.bodyEmpty;
  }

  return null;
}

export function CreateTemplateModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateTemplateModalProps) {
  const [value, setValue] = useState<TemplateFormValues>(buildInitialValue());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setValue(buildInitialValue());
    setError(null);
    setSubmitting(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateTemplate(
      {
        channel: value.channel,
        subject: value.channel === 'email' ? value.subject : null,
        body: value.body,
      },
      MESSAGE_VARIABLES[value.trigger],
    );

    const validationMessage = resolveValidationMessage(validationError);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await onSubmit({
        trigger: value.trigger,
        channel: value.channel,
        locale: value.locale,
        subject: value.channel === 'email' ? value.subject : null,
        body: value.body,
        is_active: value.is_active,
        notes: value.notes || null,
      });

      if (result && 'error' in result && result.error) {
        setError(fr.messaging.createError);
        setSubmitting(false);
        return;
      }

      onClose();
    } catch {
      setError(fr.messaging.createError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={modalTokens.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-message-template-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form onSubmit={handleSubmit} className={clsx(modalTokens.panel, 'max-w-6xl')}>
        <div className={clsx('flex items-center justify-between gap-3 border-b px-5 py-4', borderTokens.default)}>
          <h2 id="create-message-template-title" className={clsx('text-lg font-semibold', textTokens.title)}>
            {fr.messaging.create.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={fr.common.close}
            className={iconButtonToken}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[76vh] overflow-y-auto px-5 py-5">
          <TemplateEditor value={value} onChange={setValue} />
        </div>

        <div className={clsx('space-y-3 border-t px-5 py-4', borderTokens.default)}>
          {error ? (
            <div className={clsx('rounded-lg border px-3 py-2 text-sm', statusTokens.danger)}>
              {error}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              {fr.common.cancel}
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? fr.messaging.create.saving : fr.messaging.create.submit}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
