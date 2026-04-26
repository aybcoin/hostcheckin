import { describe, expect, it } from 'vitest';
import {
  MESSAGE_VARIABLES,
  defaultTemplatesFor,
  pickTemplate,
  renderTemplate,
  summarizeTemplates,
  validateTemplate,
} from '../../src/lib/messaging-logic';
import type { MessageTemplate } from '../../src/types/messaging';

function makeTemplate(overrides: Partial<MessageTemplate> = {}): MessageTemplate {
  return {
    id: 'tpl-1',
    host_id: 'host-1',
    trigger: 'checkin_day',
    channel: 'email',
    locale: 'fr',
    subject: 'Bienvenue a {property_name}',
    body: 'Bonjour {guest_name}, rendez-vous le {check_in_date}.',
    is_active: true,
    is_default: true,
    notes: null,
    created_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-01T10:00:00Z',
    ...overrides,
  };
}

describe('messaging logic', () => {
  describe('renderTemplate', () => {
    it('replaces a single placeholder', () => {
      const rendered = renderTemplate(makeTemplate({
        subject: null,
        body: 'Bonjour {guest_name}',
      }), {
        guest_name: 'Samira',
      });

      expect(rendered.body).toBe('Bonjour Samira');
      expect(rendered.missingVariables).toEqual([]);
    });

    it('replaces multiple placeholders in subject and body', () => {
      const rendered = renderTemplate(makeTemplate(), {
        guest_name: 'Samira',
        property_name: 'Riad Atlas',
        check_in_date: '2026-05-02',
      });

      expect(rendered.subject).toBe('Bienvenue a Riad Atlas');
      expect(rendered.body).toBe('Bonjour Samira, rendez-vous le 2026-05-02.');
      expect(rendered.missingVariables).toEqual([]);
    });

    it('replaces repeated placeholders every time', () => {
      const rendered = renderTemplate(makeTemplate({
        subject: null,
        body: '{guest_name} - {guest_name}',
      }), {
        guest_name: 'Leila',
      });

      expect(rendered.body).toBe('Leila - Leila');
    });

    it('keeps missing placeholders and reports them once', () => {
      const rendered = renderTemplate(makeTemplate({
        subject: null,
        body: '{guest_name} / {smart_lock_code} / {smart_lock_code}',
      }), {
        guest_name: 'Leila',
      });

      expect(rendered.body).toBe('Leila / {smart_lock_code} / {smart_lock_code}');
      expect(rendered.missingVariables).toEqual(['smart_lock_code']);
    });

    it('returns undefined subject when template subject is null', () => {
      const rendered = renderTemplate(makeTemplate({
        subject: null,
      }), {
        guest_name: 'Leila',
        check_in_date: '2026-05-03',
      });

      expect(rendered.subject).toBeUndefined();
    });

    it('supports special characters in variable values', () => {
      const rendered = renderTemplate(makeTemplate({
        subject: null,
        body: 'Code: {smart_lock_code}',
      }), {
        smart_lock_code: 'A&B/#42',
      });

      expect(rendered.body).toBe('Code: A&B/#42');
    });

    it('does not report unused undefined variables', () => {
      const rendered = renderTemplate(makeTemplate({
        subject: null,
        body: 'Bonjour {guest_name}',
      }), {
        guest_name: 'Nora',
        property_name: undefined,
      });

      expect(rendered.missingVariables).toEqual([]);
    });

    it('supports adjacent placeholders', () => {
      const rendered = renderTemplate(makeTemplate({
        subject: null,
        body: '{check_in_date}{check_out_date}',
      }), {
        check_in_date: '2026-05-01',
        check_out_date: '2026-05-04',
      });

      expect(rendered.body).toBe('2026-05-012026-05-04');
    });
  });

  describe('pickTemplate', () => {
    it('returns the exact active default match first', () => {
      const templates = [
        makeTemplate({ id: 'fr', locale: 'fr' }),
        makeTemplate({ id: 'en', locale: 'en' }),
      ];

      const picked = pickTemplate(templates, {
        trigger: 'checkin_day',
        channel: 'email',
        locale: 'en',
      });

      expect(picked?.id).toBe('en');
    });

    it('falls back to french active default when the locale match is missing', () => {
      const templates = [makeTemplate({ id: 'fr', locale: 'fr' })];

      const picked = pickTemplate(templates, {
        trigger: 'checkin_day',
        channel: 'email',
        locale: 'darija',
      });

      expect(picked?.id).toBe('fr');
    });

    it('falls back to french when the locale match is inactive', () => {
      const templates = [
        makeTemplate({ id: 'fr', locale: 'fr', is_active: true }),
        makeTemplate({ id: 'ar', locale: 'ar', is_active: false }),
      ];

      const picked = pickTemplate(templates, {
        trigger: 'checkin_day',
        channel: 'email',
        locale: 'ar',
      });

      expect(picked?.id).toBe('fr');
    });

    it('ignores non-default templates', () => {
      const templates = [
        makeTemplate({ id: 'fr-default', locale: 'fr' }),
        makeTemplate({ id: 'en-custom', locale: 'en', is_default: false }),
      ];

      const picked = pickTemplate(templates, {
        trigger: 'checkin_day',
        channel: 'email',
        locale: 'en',
      });

      expect(picked?.id).toBe('fr-default');
    });

    it('filters by host id when provided', () => {
      const templates = [
        makeTemplate({ id: 'host-1-fr', host_id: 'host-1', locale: 'fr' }),
        makeTemplate({ id: 'host-2-en', host_id: 'host-2', locale: 'en' }),
      ];

      const picked = pickTemplate(templates, {
        trigger: 'checkin_day',
        channel: 'email',
        locale: 'en',
        hostId: 'host-2',
      });

      expect(picked?.id).toBe('host-2-en');
    });

    it('returns null when neither exact nor french default exists', () => {
      const templates = [
        makeTemplate({ channel: 'sms', locale: 'fr' }),
      ];

      const picked = pickTemplate(templates, {
        trigger: 'checkin_day',
        channel: 'email',
        locale: 'fr',
      });

      expect(picked).toBeNull();
    });
  });

  describe('defaultTemplatesFor', () => {
    it('returns 40 starter templates', () => {
      expect(defaultTemplatesFor('host-1')).toHaveLength(40);
    });

    it('assigns the provided host id to every starter template', () => {
      const templates = defaultTemplatesFor('host-42');
      expect(templates.every((template) => template.host_id === 'host-42')).toBe(true);
    });

    it('marks all starter templates as active defaults', () => {
      const templates = defaultTemplatesFor('host-1');
      expect(templates.every((template) => template.is_active && template.is_default)).toBe(true);
    });

    it('adds a subject to every email starter template', () => {
      const emailTemplates = defaultTemplatesFor('host-1').filter((template) => template.channel === 'email');
      expect(emailTemplates.every((template) => typeof template.subject === 'string' && template.subject.length > 0)).toBe(true);
    });

    it('keeps sms starter template subjects null', () => {
      const smsTemplates = defaultTemplatesFor('host-1').filter((template) => template.channel === 'sms');
      expect(smsTemplates.every((template) => template.subject === null)).toBe(true);
    });

    it('covers every trigger, channel and locale combination exactly once', () => {
      const signatures = defaultTemplatesFor('host-1').map(
        (template) => `${template.trigger}:${template.channel}:${template.locale}`,
      );

      expect(new Set(signatures).size).toBe(40);
    });

    it('generates only starter templates with valid variables', () => {
      const templates = defaultTemplatesFor('host-1');

      for (const template of templates) {
        expect(validateTemplate(template, MESSAGE_VARIABLES[template.trigger])).toBeNull();
      }
    });
  });

  describe('validateTemplate', () => {
    it('returns emailMissingSubject for email templates without subject', () => {
      const error = validateTemplate(makeTemplate({
        subject: '   ',
      }), MESSAGE_VARIABLES.checkin_day);

      expect(error).toBe('emailMissingSubject');
    });

    it('returns bodyEmpty when the body is blank', () => {
      const error = validateTemplate(makeTemplate({
        body: '   ',
      }), MESSAGE_VARIABLES.checkin_day);

      expect(error).toBe('bodyEmpty');
    });

    it('returns unknownVariable for body placeholders that are not allowed', () => {
      const error = validateTemplate(makeTemplate({
        body: 'Bonjour {unknown_key}',
      }), MESSAGE_VARIABLES.checkin_day);

      expect(error).toBe('unknownVariable:unknown_key');
    });

    it('returns unknownVariable for subject placeholders that are not allowed', () => {
      const error = validateTemplate(makeTemplate({
        subject: 'Sujet {unknown_key}',
      }), MESSAGE_VARIABLES.checkin_day);

      expect(error).toBe('unknownVariable:unknown_key');
    });

    it('accepts a valid email template', () => {
      const error = validateTemplate(makeTemplate(), MESSAGE_VARIABLES.checkin_day);
      expect(error).toBeNull();
    });

    it('accepts an sms template without subject', () => {
      const error = validateTemplate(makeTemplate({
        channel: 'sms',
        subject: null,
      }), MESSAGE_VARIABLES.checkin_day);

      expect(error).toBeNull();
    });
  });

  describe('summarizeTemplates', () => {
    it('counts total and active templates', () => {
      const summary = summarizeTemplates([
        makeTemplate({ id: '1', is_active: true }),
        makeTemplate({ id: '2', channel: 'sms', is_active: false }),
      ]);

      expect(summary.total).toBe(2);
      expect(summary.active).toBe(1);
    });

    it('aggregates templates by trigger', () => {
      const summary = summarizeTemplates([
        makeTemplate({ id: '1', trigger: 'checkin_day' }),
        makeTemplate({ id: '2', trigger: 'checkin_day', channel: 'sms' }),
        makeTemplate({ id: '3', trigger: 'contract_signed' }),
      ]);

      expect(summary.byTrigger.checkin_day).toBe(2);
      expect(summary.byTrigger.contract_signed).toBe(1);
    });

    it('aggregates templates by locale', () => {
      const summary = summarizeTemplates([
        makeTemplate({ id: '1', locale: 'fr' }),
        makeTemplate({ id: '2', locale: 'fr', channel: 'sms' }),
        makeTemplate({ id: '3', locale: 'darija' }),
      ]);

      expect(summary.byLocale.fr).toBe(2);
      expect(summary.byLocale.darija).toBe(1);
    });

    it('reports no missing defaults for the seeded template set', () => {
      const templates = defaultTemplatesFor('host-1').map((template, index) =>
        makeTemplate({
          id: `seed-${index}`,
          host_id: template.host_id,
          trigger: template.trigger,
          channel: template.channel,
          locale: template.locale,
          subject: template.subject ?? null,
          body: template.body,
          is_active: template.is_active ?? true,
          is_default: template.is_default ?? false,
          notes: template.notes ?? null,
        }),
      );

      const summary = summarizeTemplates(templates);
      expect(summary.missingDefaults).toEqual([]);
    });

    it('reports a missing default when a combination is absent', () => {
      const templates = defaultTemplatesFor('host-1')
        .filter((template) => !(template.trigger === 'checkin_day' && template.channel === 'email' && template.locale === 'en'))
        .map((template, index) =>
          makeTemplate({
            id: `seed-${index}`,
            host_id: template.host_id,
            trigger: template.trigger,
            channel: template.channel,
            locale: template.locale,
            subject: template.subject ?? null,
            body: template.body,
            is_active: template.is_active ?? true,
            is_default: template.is_default ?? false,
            notes: template.notes ?? null,
          }),
        );

      const summary = summarizeTemplates(templates);

      expect(summary.missingDefaults).toContainEqual({
        trigger: 'checkin_day',
        channel: 'email',
        locale: 'en',
      });
    });

    it('treats inactive defaults as missing coverage', () => {
      const templates = defaultTemplatesFor('host-1').map((template, index) =>
        makeTemplate({
          id: `seed-${index}`,
          host_id: template.host_id,
          trigger: template.trigger,
          channel: template.channel,
          locale: template.locale,
          subject: template.subject ?? null,
          body: template.body,
          is_active:
            template.trigger === 'verification_complete'
            && template.channel === 'sms'
            && template.locale === 'ar'
              ? false
              : template.is_active ?? true,
          is_default: template.is_default ?? false,
          notes: template.notes ?? null,
        }),
      );

      const summary = summarizeTemplates(templates);

      expect(summary.missingDefaults).toContainEqual({
        trigger: 'verification_complete',
        channel: 'sms',
        locale: 'ar',
      });
    });
  });
});
