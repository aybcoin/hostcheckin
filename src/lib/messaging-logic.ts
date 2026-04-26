import type { AutomationTrigger } from '../types/automations';
import {
  MESSAGE_CHANNELS,
  MESSAGE_LOCALES,
  MESSAGE_TRIGGERS,
  type MessageChannel,
  type MessageLocale,
  type MessageTemplate,
  type MessageTemplateDefaultGap,
  type MessageTemplateSeedInput,
  type MessageTemplateSummary,
  type MessageVariable,
  type RenderedMessage,
} from '../types/messaging';

const PLACEHOLDER_PATTERN = /\{([a-z0-9_]+)\}/gi;

const SHARED_VARIABLES = {
  guest_name: {
    key: 'guest_name',
    description: 'guest_name',
    example: 'Samira Benali',
  },
  property_name: {
    key: 'property_name',
    description: 'property_name',
    example: 'Riad Atlas',
  },
  check_in_date: {
    key: 'check_in_date',
    description: 'check_in_date',
    example: '2026-05-02',
  },
  check_out_date: {
    key: 'check_out_date',
    description: 'check_out_date',
    example: '2026-05-05',
  },
  check_in_time: {
    key: 'check_in_time',
    description: 'check_in_time',
    example: '15:00',
  },
  check_out_time: {
    key: 'check_out_time',
    description: 'check_out_time',
    example: '11:00',
  },
  smart_lock_code: {
    key: 'smart_lock_code',
    description: 'smart_lock_code',
    example: '4821#',
  },
  sender_name: {
    key: 'sender_name',
    description: 'sender_name',
    example: 'HostCheckIn',
  },
} as const satisfies Record<string, MessageVariable>;

export const MESSAGE_VARIABLES: Record<AutomationTrigger, MessageVariable[]> = {
  checkin_reminder_j1: [
    SHARED_VARIABLES.guest_name,
    SHARED_VARIABLES.property_name,
    SHARED_VARIABLES.check_in_date,
    SHARED_VARIABLES.check_in_time,
    SHARED_VARIABLES.check_out_date,
  ],
  checkin_day: [
    SHARED_VARIABLES.guest_name,
    SHARED_VARIABLES.property_name,
    SHARED_VARIABLES.check_in_date,
    SHARED_VARIABLES.check_in_time,
    SHARED_VARIABLES.check_out_date,
    SHARED_VARIABLES.smart_lock_code,
  ],
  checkout_reminder: [
    SHARED_VARIABLES.guest_name,
    SHARED_VARIABLES.property_name,
    SHARED_VARIABLES.check_out_date,
    SHARED_VARIABLES.check_out_time,
  ],
  contract_signed: [
    SHARED_VARIABLES.guest_name,
    SHARED_VARIABLES.property_name,
    SHARED_VARIABLES.check_in_date,
    SHARED_VARIABLES.check_out_date,
  ],
  verification_complete: [
    SHARED_VARIABLES.sender_name,
    SHARED_VARIABLES.guest_name,
    SHARED_VARIABLES.property_name,
    SHARED_VARIABLES.check_in_date,
    SHARED_VARIABLES.check_out_date,
  ],
};

type StarterTemplateMap = Record<
MessageLocale,
Record<AutomationTrigger, Record<MessageChannel, { subject?: string; body: string }>>
>;

const STARTER_TEMPLATE_COPY: StarterTemplateMap = {
  fr: {
    checkin_reminder_j1: {
      email: {
        subject: 'Rappel avant votre arrivee a {property_name}',
        body:
          'Bonjour {guest_name}, votre arrivee a {property_name} est prevue le {check_in_date} a partir de {check_in_time}. Votre depart est prevu le {check_out_date}. Repondez a ce message si vous avez besoin d’aide.',
      },
      sms: {
        body:
          'Bonjour {guest_name}, rappel: arrivee a {property_name} le {check_in_date} a {check_in_time}. Depart le {check_out_date}.',
      },
    },
    checkin_day: {
      email: {
        subject: 'Bienvenue a {property_name}',
        body:
          'Bonjour {guest_name}, bienvenue a {property_name}. Votre check-in est prevu aujourd’hui a partir de {check_in_time}. Votre code d’acces est {smart_lock_code}. Votre depart est prevu le {check_out_date}.',
      },
      sms: {
        body:
          'Bienvenue {guest_name}. Check-in aujourd’hui a {property_name} des {check_in_time}. Code d’acces: {smart_lock_code}.',
      },
    },
    checkout_reminder: {
      email: {
        subject: 'Rappel check-out pour demain',
        body:
          'Bonjour {guest_name}, votre depart de {property_name} est prevu demain, le {check_out_date}, a {check_out_time}. Merci de fermer le logement en quittant les lieux.',
      },
      sms: {
        body:
          'Bonjour {guest_name}, check-out demain de {property_name} le {check_out_date} a {check_out_time}. Merci.',
      },
    },
    contract_signed: {
      email: {
        subject: 'Contrat signe pour {property_name}',
        body:
          'Bonjour {guest_name}, votre contrat pour {property_name} a bien ete signe. Votre sejour commence le {check_in_date} et se termine le {check_out_date}.',
      },
      sms: {
        body:
          'Bonjour {guest_name}, votre contrat pour {property_name} est signe. Sejour du {check_in_date} au {check_out_date}.',
      },
    },
    verification_complete: {
      email: {
        subject: 'Identite verifiee pour {guest_name}',
        body:
          'Bonjour {sender_name}, l’identite de {guest_name} pour {property_name} a ete verifiee avec succes. Arrivee le {check_in_date}, depart le {check_out_date}.',
      },
      sms: {
        body:
          'Bonjour {sender_name}, identite verifiee pour {guest_name} a {property_name}. Arrivee {check_in_date}.',
      },
    },
  },
  en: {
    checkin_reminder_j1: {
      email: {
        subject: 'Arrival reminder for {property_name}',
        body:
          'Hello {guest_name}, this is a reminder that your arrival at {property_name} is scheduled for {check_in_date} from {check_in_time}. Your departure is planned for {check_out_date}. Reply to this message if you need anything.',
      },
      sms: {
        body:
          'Hello {guest_name}, reminder: arrival at {property_name} on {check_in_date} from {check_in_time}. Check-out on {check_out_date}.',
      },
    },
    checkin_day: {
      email: {
        subject: 'Welcome to {property_name}',
        body:
          'Hello {guest_name}, welcome to {property_name}. Your check-in is today from {check_in_time}. Your smart lock code is {smart_lock_code}. Your check-out date is {check_out_date}.',
      },
      sms: {
        body:
          'Welcome {guest_name}. Check-in today at {property_name} from {check_in_time}. Access code: {smart_lock_code}.',
      },
    },
    checkout_reminder: {
      email: {
        subject: 'Check-out reminder for tomorrow',
        body:
          'Hello {guest_name}, your departure from {property_name} is scheduled for tomorrow, {check_out_date}, at {check_out_time}. Thank you for leaving the property locked when you go.',
      },
      sms: {
        body:
          'Hello {guest_name}, check-out tomorrow from {property_name} on {check_out_date} at {check_out_time}. Thank you.',
      },
    },
    contract_signed: {
      email: {
        subject: 'Contract signed for {property_name}',
        body:
          'Hello {guest_name}, your stay agreement for {property_name} has been signed successfully. Your stay starts on {check_in_date} and ends on {check_out_date}.',
      },
      sms: {
        body:
          'Hello {guest_name}, your contract for {property_name} is signed. Stay from {check_in_date} to {check_out_date}.',
      },
    },
    verification_complete: {
      email: {
        subject: 'Identity verified for {guest_name}',
        body:
          'Hello {sender_name}, the identity of {guest_name} for {property_name} has been verified successfully. Arrival on {check_in_date}, departure on {check_out_date}.',
      },
      sms: {
        body:
          'Hello {sender_name}, identity verified for {guest_name} at {property_name}. Arrival {check_in_date}.',
      },
    },
  },
  ar: {
    checkin_reminder_j1: {
      email: {
        subject: 'تذكير بوصولك إلى {property_name}',
        body:
          'مرحبًا {guest_name}، نود تذكيرك بأن موعد الوصول إلى {property_name} هو {check_in_date} ابتداءً من {check_in_time}. موعد المغادرة هو {check_out_date}. إذا كانت لديك أي أسئلة، يرجى الرد على هذه الرسالة.',
      },
      sms: {
        body:
          'مرحبًا {guest_name}، تذكير: الوصول إلى {property_name} يوم {check_in_date} من {check_in_time}. المغادرة يوم {check_out_date}.',
      },
    },
    checkin_day: {
      email: {
        subject: 'مرحبًا بك في {property_name}',
        body:
          'مرحبًا {guest_name}، أهلاً بك في {property_name}. موعد تسجيل الدخول اليوم ابتداءً من {check_in_time}. رمز القفل الذكي هو {smart_lock_code}. موعد المغادرة هو {check_out_date}.',
      },
      sms: {
        body:
          'أهلاً {guest_name}. تسجيل الدخول اليوم في {property_name} من {check_in_time}. رمز الدخول: {smart_lock_code}.',
      },
    },
    checkout_reminder: {
      email: {
        subject: 'تذكير بتسجيل الخروج غدًا',
        body:
          'مرحبًا {guest_name}، موعد مغادرتك من {property_name} هو غدًا {check_out_date} عند {check_out_time}. شكرًا لترك السكن مغلقًا عند المغادرة.',
      },
      sms: {
        body:
          'مرحبًا {guest_name}، تسجيل الخروج غدًا من {property_name} يوم {check_out_date} عند {check_out_time}. شكرًا لك.',
      },
    },
    contract_signed: {
      email: {
        subject: 'تم توقيع العقد الخاص بـ {property_name}',
        body:
          'مرحبًا {guest_name}، تم توقيع عقد الإقامة الخاص بـ {property_name} بنجاح. يبدأ إقامتك في {check_in_date} وتنتهي في {check_out_date}.',
      },
      sms: {
        body:
          'مرحبًا {guest_name}، تم توقيع عقد {property_name}. الإقامة من {check_in_date} إلى {check_out_date}.',
      },
    },
    verification_complete: {
      email: {
        subject: 'تم التحقق من هوية {guest_name}',
        body:
          'مرحبًا {sender_name}، تم التحقق من هوية {guest_name} الخاصة بـ {property_name} بنجاح. الوصول في {check_in_date} والمغادرة في {check_out_date}.',
      },
      sms: {
        body:
          'مرحبًا {sender_name}، تم التحقق من هوية {guest_name} في {property_name}. الوصول {check_in_date}.',
      },
    },
  },
  darija: {
    checkin_reminder_j1: {
      email: {
        subject: 'تذكير قبل الوصول لـ {property_name}',
        body:
          'سلام {guest_name}، غير كنفكروك بلي الوصول ديالك لـ {property_name} مبرمج نهار {check_in_date} من {check_in_time}. الخروج مبرمج نهار {check_out_date}. إلا كان عندك شي سؤال جاوب على هاد الرسالة.',
      },
      sms: {
        body:
          'سلام {guest_name}، تذكير: الوصول لـ {property_name} نهار {check_in_date} من {check_in_time}. الخروج نهار {check_out_date}.',
      },
    },
    checkin_day: {
      email: {
        subject: 'مرحبا بيك فـ {property_name}',
        body:
          'سلام {guest_name}، مرحبا بيك فـ {property_name}. الدخول اليوم من {check_in_time}. كود الدخول هو {smart_lock_code}. الخروج مبرمج نهار {check_out_date}.',
      },
      sms: {
        body:
          'مرحبا {guest_name}. الدخول اليوم لـ {property_name} من {check_in_time}. كود الدخول: {smart_lock_code}.',
      },
    },
    checkout_reminder: {
      email: {
        subject: 'تذكير بالخروج غدا',
        body:
          'سلام {guest_name}، الخروج من {property_name} مبرمج غدا {check_out_date} مع {check_out_time}. عفاك خلي السكن مسدود ملي تخرج.',
      },
      sms: {
        body:
          'سلام {guest_name}، الخروج غدا من {property_name} نهار {check_out_date} مع {check_out_time}. شكرا.',
      },
    },
    contract_signed: {
      email: {
        subject: 'العقد تْوقع ديال {property_name}',
        body:
          'سلام {guest_name}، العقد ديال الإقامة فـ {property_name} تْوقع بنجاح. الإقامة ديالك من {check_in_date} حتى {check_out_date}.',
      },
      sms: {
        body:
          'سلام {guest_name}، العقد ديال {property_name} تْوقع. الإقامة من {check_in_date} حتى {check_out_date}.',
      },
    },
    verification_complete: {
      email: {
        subject: 'الهوية تْحققات ديال {guest_name}',
        body:
          'سلام {sender_name}، التحقق من الهوية ديال {guest_name} فـ {property_name} تم بنجاح. الوصول نهار {check_in_date} والخروج نهار {check_out_date}.',
      },
      sms: {
        body:
          'سلام {sender_name}، الهوية ديال {guest_name} تْحققات فـ {property_name}. الوصول {check_in_date}.',
      },
    },
  },
};

function extractPlaceholders(text: string | null | undefined): string[] {
  if (!text) return [];

  const matches = text.matchAll(PLACEHOLDER_PATTERN);
  const placeholders: string[] = [];
  const seen = new Set<string>();

  for (const match of matches) {
    const key = match[1]?.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    placeholders.push(key);
  }

  return placeholders;
}

function renderText(
  text: string | null | undefined,
  variables: Record<string, string | undefined>,
  missingVariables: string[],
): string | undefined {
  if (!text) return undefined;

  return text.replace(PLACEHOLDER_PATTERN, (rawMatch, rawKey: string) => {
    const key = rawKey.trim();
    const value = variables[key];

    if (typeof value === 'string') {
      return value;
    }

    if (!missingVariables.includes(key)) {
      missingVariables.push(key);
    }

    return rawMatch;
  });
}

function createZeroTriggerMap(): Record<AutomationTrigger, number> {
  return {
    checkin_reminder_j1: 0,
    checkin_day: 0,
    checkout_reminder: 0,
    contract_signed: 0,
    verification_complete: 0,
  };
}

function createZeroLocaleMap(): Record<MessageLocale, number> {
  return {
    fr: 0,
    en: 0,
    ar: 0,
    darija: 0,
  };
}

export function renderTemplate(
  template: Pick<MessageTemplate, 'subject' | 'body'>,
  variables: Record<string, string | undefined>,
): RenderedMessage {
  const missingVariables: string[] = [];
  const subject = renderText(template.subject, variables, missingVariables);
  const body = renderText(template.body, variables, missingVariables) ?? '';

  return {
    subject,
    body,
    missingVariables,
  };
}

export function pickTemplate(
  templates: readonly MessageTemplate[],
  criteria: {
    trigger: AutomationTrigger;
    channel: MessageChannel;
    locale: MessageLocale;
    hostId?: string;
  },
): MessageTemplate | null {
  const scoped = templates.filter((template) => {
    if (criteria.hostId && template.host_id !== criteria.hostId) return false;

    return template.is_active
      && template.is_default
      && template.trigger === criteria.trigger
      && template.channel === criteria.channel;
  });

  const exact = scoped.find((template) => template.locale === criteria.locale);
  if (exact) return exact;

  const frenchFallback = scoped.find((template) => template.locale === 'fr');
  return frenchFallback ?? null;
}

export function defaultTemplatesFor(hostId: string): MessageTemplateSeedInput[] {
  const templates: MessageTemplateSeedInput[] = [];

  for (const trigger of MESSAGE_TRIGGERS) {
    for (const channel of MESSAGE_CHANNELS) {
      for (const locale of MESSAGE_LOCALES) {
        const starter = STARTER_TEMPLATE_COPY[locale][trigger][channel];

        templates.push({
          host_id: hostId,
          trigger,
          channel,
          locale,
          subject: starter.subject ?? null,
          body: starter.body,
          is_active: true,
          is_default: true,
          notes: null,
        });
      }
    }
  }

  return templates;
}

export function validateTemplate(
  template: Pick<MessageTemplate, 'channel' | 'subject' | 'body'>,
  variables: readonly MessageVariable[],
): string | null {
  if (template.channel === 'email' && (!template.subject || template.subject.trim().length === 0)) {
    return 'emailMissingSubject';
  }

  if (template.body.trim().length === 0) {
    return 'bodyEmpty';
  }

  const allowedKeys = new Set(variables.map((variable) => variable.key));
  const usedKeys = [
    ...extractPlaceholders(template.subject),
    ...extractPlaceholders(template.body),
  ];

  for (const key of usedKeys) {
    if (!allowedKeys.has(key)) {
      return `unknownVariable:${key}`;
    }
  }

  return null;
}

export function summarizeTemplates(templates: readonly MessageTemplate[]): MessageTemplateSummary {
  const byTrigger = createZeroTriggerMap();
  const byLocale = createZeroLocaleMap();
  const missingDefaults: MessageTemplateDefaultGap[] = [];

  for (const template of templates) {
    byTrigger[template.trigger] += 1;
    byLocale[template.locale] += 1;
  }

  for (const trigger of MESSAGE_TRIGGERS) {
    for (const channel of MESSAGE_CHANNELS) {
      for (const locale of MESSAGE_LOCALES) {
        const hasActiveDefault = templates.some(
          (template) =>
            template.trigger === trigger
            && template.channel === channel
            && template.locale === locale
            && template.is_default
            && template.is_active,
        );

        if (!hasActiveDefault) {
          missingDefaults.push({ trigger, channel, locale });
        }
      }
    }
  }

  return {
    total: templates.length,
    active: templates.filter((template) => template.is_active).length,
    byTrigger,
    byLocale,
    missingDefaults,
  };
}
