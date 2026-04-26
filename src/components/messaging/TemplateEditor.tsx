import { useMemo, useRef } from 'react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  chipTokens,
  inputTokens,
  statusTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { MESSAGE_VARIABLES, renderTemplate, validateTemplate } from '../../lib/messaging-logic';
import type { AutomationTrigger } from '../../types/automations';
import type { MessageChannel, MessageLocale } from '../../types/messaging';

export interface TemplateFormValues {
  trigger: AutomationTrigger;
  channel: MessageChannel;
  locale: MessageLocale;
  subject: string;
  body: string;
  is_active: boolean;
  notes: string;
}

interface TemplateEditorProps {
  value: TemplateFormValues;
  onChange: (nextValue: TemplateFormValues) => void;
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

function variableDescription(trigger: AutomationTrigger, key: string): string {
  const descriptions = fr.messaging.variables[trigger];

  if (key in descriptions) {
    // Keys come from MESSAGE_VARIABLES and are narrowed at runtime against the i18n map above.
    return descriptions[key as keyof typeof descriptions];
  }

  return key;
}

export function TemplateEditor({ value, onChange }: TemplateEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const availableVariables = MESSAGE_VARIABLES[value.trigger];

  const validationError = useMemo(
    () =>
      validateTemplate(
        {
          channel: value.channel,
          subject: value.channel === 'email' ? value.subject : null,
          body: value.body,
        },
        availableVariables,
      ),
    [availableVariables, value.body, value.channel, value.subject],
  );

  const mockVariables = useMemo<Record<string, string>>(
    () =>
      Object.fromEntries(
        availableVariables.map((variable) => [variable.key, variable.example]),
      ),
    [availableVariables],
  );

  const preview = useMemo(
    () =>
      renderTemplate(
        {
          subject: value.channel === 'email' ? value.subject : null,
          body: value.body,
        },
        mockVariables,
      ),
    [mockVariables, value.body, value.channel, value.subject],
  );

  const updateValue = <Key extends keyof TemplateFormValues>(key: Key, nextFieldValue: TemplateFormValues[Key]) => {
    onChange({
      ...value,
      [key]: nextFieldValue,
    });
  };

  const insertVariable = (key: string) => {
    const placeholder = `{${key}}`;
    const textarea = textareaRef.current;

    if (!textarea) {
      updateValue('body', `${value.body}${placeholder}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextBody = `${value.body.slice(0, start)}${placeholder}${value.body.slice(end)}`;

    updateValue('body', nextBody);

    requestAnimationFrame(() => {
      textarea.focus();
      const nextPosition = start + placeholder.length;
      textarea.setSelectionRange(nextPosition, nextPosition);
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="message-template-trigger" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.messaging.filters.triggerLabel}
            </label>
            <select
              id="message-template-trigger"
              value={value.trigger}
              onChange={(event) => updateValue('trigger', event.target.value as AutomationTrigger)}
              className={inputTokens.base}
            >
              <option value="checkin_reminder_j1">{fr.automations.triggers.checkin_reminder_j1}</option>
              <option value="checkin_day">{fr.automations.triggers.checkin_day}</option>
              <option value="checkout_reminder">{fr.automations.triggers.checkout_reminder}</option>
              <option value="contract_signed">{fr.automations.triggers.contract_signed}</option>
              <option value="verification_complete">{fr.automations.triggers.verification_complete}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="message-template-channel" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.messaging.filters.channelLabel}
            </label>
            <select
              id="message-template-channel"
              value={value.channel}
              onChange={(event) => updateValue('channel', event.target.value as MessageChannel)}
              className={inputTokens.base}
            >
              <option value="email">{fr.messaging.channels.email}</option>
              <option value="sms">{fr.messaging.channels.sms}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="message-template-locale" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.messaging.filters.localeLabel}
            </label>
            <select
              id="message-template-locale"
              value={value.locale}
              onChange={(event) => updateValue('locale', event.target.value as MessageLocale)}
              className={inputTokens.base}
            >
              <option value="fr">{fr.messaging.locales.fr}</option>
              <option value="en">{fr.messaging.locales.en}</option>
              <option value="ar">{fr.messaging.locales.ar}</option>
              <option value="darija">{fr.messaging.locales.darija}</option>
            </select>
          </div>
        </div>

        {value.channel === 'email' ? (
          <div className="space-y-1.5">
            <label htmlFor="message-template-subject" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.messaging.editor.subject}
            </label>
            <input
              id="message-template-subject"
              type="text"
              value={value.subject}
              onChange={(event) => updateValue('subject', event.target.value)}
              className={inputTokens.base}
            />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="message-template-body" className={clsx('text-sm font-medium', textTokens.title)}>
              {fr.messaging.editor.body}
            </label>
            <label className={clsx('inline-flex items-center gap-2 text-xs', textTokens.body)}>
              <input
                type="checkbox"
                checked={value.is_active}
                onChange={(event) => updateValue('is_active', event.target.checked)}
                className={clsx('h-4 w-4 rounded border', borderTokens.default)}
              />
              {fr.messaging.editor.active}
            </label>
          </div>
          <textarea
            id="message-template-body"
            ref={textareaRef}
            value={value.body}
            onChange={(event) => updateValue('body', event.target.value)}
            rows={14}
            className={clsx(inputTokens.base, 'min-h-[320px] resize-y font-mono')}
          />
        </div>

        {resolveValidationMessage(validationError) ? (
          <div className={clsx('rounded-lg border px-3 py-2 text-sm', statusTokens.danger)}>
            {resolveValidationMessage(validationError)}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <section className={clsx('space-y-3 rounded-xl border p-4', borderTokens.default, surfaceTokens.subtle)}>
          <div className="flex items-center justify-between gap-2">
            <h3 className={clsx('text-sm font-semibold', textTokens.title)}>
              {fr.messaging.editor.variablesAvailable}
            </h3>
            <span className={clsx('text-xs', textTokens.subtle)}>
              {fr.messaging.editor.insertVariable}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableVariables.map((variable) => (
              <button
                key={variable.key}
                type="button"
                onClick={() => insertVariable(variable.key)}
                className={clsx(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  chipTokens.primary,
                )}
                title={variableDescription(value.trigger, variable.key)}
              >
                {`{${variable.key}}`}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {availableVariables.map((variable) => (
              <div key={variable.key} className={clsx('rounded-lg border p-2', borderTokens.default, surfaceTokens.panel)}>
                <p className={clsx('text-xs font-semibold', textTokens.title)}>{`{${variable.key}}`}</p>
                <p className={clsx('text-xs', textTokens.muted)}>
                  {variableDescription(value.trigger, variable.key)}
                </p>
                <p className={clsx('mt-1 text-[11px]', textTokens.subtle)}>
                  {variable.example}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={clsx('space-y-3 rounded-xl border p-4', borderTokens.default)}>
          <h3 className={clsx('text-sm font-semibold', textTokens.title)}>
            {fr.messaging.editor.preview}
          </h3>

          {!value.body.trim() ? (
            <p className={clsx('text-sm', textTokens.muted)}>{fr.messaging.editor.empty}</p>
          ) : (
            <div
              className={clsx(
                'space-y-3 rounded-lg border p-3',
                borderTokens.default,
                surfaceTokens.subtle,
                value.locale === 'ar' && 'text-right',
              )}
              dir={value.locale === 'ar' ? 'rtl' : 'ltr'}
            >
              {value.channel === 'email' ? (
                <div className="space-y-1">
                  <p className={clsx('text-xs font-medium uppercase tracking-wide', textTokens.subtle)}>
                    {fr.messaging.templateCard.subjectLabel}
                  </p>
                  <p className={clsx('whitespace-pre-wrap text-sm', textTokens.body)}>
                    {preview.subject || '—'}
                  </p>
                </div>
              ) : null}

              <div className="space-y-1">
                <p className={clsx('text-xs font-medium uppercase tracking-wide', textTokens.subtle)}>
                  {fr.messaging.templateCard.bodyLabel}
                </p>
                <p className={clsx('whitespace-pre-wrap text-sm', textTokens.body)}>
                  {preview.body}
                </p>
              </div>
            </div>
          )}

          {preview.missingVariables.length > 0 ? (
            <div className={clsx('rounded-lg border px-3 py-2 text-xs', statusTokens.warning)}>
              {fr.messaging.editor.missingVariables(preview.missingVariables.join(', '))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
