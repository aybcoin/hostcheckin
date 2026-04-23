import type {
  AutomationRule,
  AutomationTrigger,
  NotificationChannel,
} from '../types/automations';

export interface NotificationMessagePayload {
  guestName: string;
  propertyName: string;
  checkinDate: string;
  checkoutDate: string;
  senderName: string;
}

export interface NotificationPayload {
  reservationId: string;
  trigger: AutomationTrigger;
  channel: NotificationChannel;
  recipientType: 'host' | 'guest' | 'both';
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  propertyName: string;
  checkinDate: string;
  checkoutDate: string;
  hostEmail: string;
  hostPhone?: string;
  senderName: string;
}

const AUTOMATION_TRIGGERS: AutomationTrigger[] = [
  'checkin_reminder_j1',
  'checkin_day',
  'checkout_reminder',
  'contract_signed',
  'verification_complete',
];

const NOTIFICATION_CHANNELS: NotificationChannel[] = ['email', 'sms', 'both'];
const RECIPIENT_TYPES = ['host', 'guest', 'both'] as const;

type RecipientType = (typeof RECIPIENT_TYPES)[number];

const TEMPLATE_BY_TRIGGER: Record<AutomationTrigger, (payload: NotificationMessagePayload) => string> = {
  checkin_reminder_j1: ({ guestName, propertyName, checkinDate }) =>
    `Bonjour ${guestName}, votre arrivée à ${propertyName} est demain. Check-in prévu le ${checkinDate}. N'hésitez pas à nous contacter.`,
  checkin_day: ({ guestName, propertyName }) =>
    `Bonjour ${guestName}, bienvenue ! Votre check-in à ${propertyName} est aujourd'hui. Nous sommes disponibles pour vous accueillir.`,
  checkout_reminder: ({ guestName, propertyName, checkoutDate }) =>
    `Bonjour ${guestName}, votre séjour à ${propertyName} se termine demain. Check-out prévu le ${checkoutDate}. Merci pour votre confiance.`,
  contract_signed: ({ guestName, propertyName }) =>
    `Bonjour ${guestName}, votre contrat de séjour pour ${propertyName} a bien été signé. Bonne préparation !`,
  verification_complete: ({ guestName, propertyName, senderName }) =>
    `Bonjour ${senderName}, l'identité de ${guestName} pour ${propertyName} vient d'être vérifiée avec succès.`,
};

function isAutomationTrigger(value: unknown): value is AutomationTrigger {
  return typeof value === 'string' && AUTOMATION_TRIGGERS.includes(value as AutomationTrigger);
}

function isNotificationChannel(value: unknown): value is NotificationChannel {
  return typeof value === 'string' && NOTIFICATION_CHANNELS.includes(value as NotificationChannel);
}

function isRecipientType(value: unknown): value is RecipientType {
  return typeof value === 'string' && RECIPIENT_TYPES.includes(value as RecipientType);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function buildNotificationMessage(
  trigger: AutomationTrigger,
  payload: NotificationMessagePayload,
): string {
  return TEMPLATE_BY_TRIGGER[trigger](payload);
}

export function getNotificationPayloadValidationErrors(
  payload: Partial<NotificationPayload>,
): string[] {
  const errors: string[] = [];

  if (!hasText(payload.reservationId)) {
    errors.push('reservationId is required');
  }

  if (!isAutomationTrigger(payload.trigger)) {
    errors.push('trigger is invalid');
  }

  if (!isNotificationChannel(payload.channel)) {
    errors.push('channel is invalid');
  }

  if (!isRecipientType(payload.recipientType)) {
    errors.push('recipientType is invalid');
  }

  if (!hasText(payload.guestName)) {
    errors.push('guestName is required');
  }

  if (!hasText(payload.propertyName)) {
    errors.push('propertyName is required');
  }

  if (!hasText(payload.checkinDate)) {
    errors.push('checkinDate is required');
  }

  if (!hasText(payload.checkoutDate)) {
    errors.push('checkoutDate is required');
  }

  if (!hasText(payload.hostEmail)) {
    errors.push('hostEmail is required');
  }

  if (!hasText(payload.senderName)) {
    errors.push('senderName is required');
  }

  const recipientType = payload.recipientType;
  const channel = payload.channel;

  if ((recipientType === 'guest' || recipientType === 'both') && (channel === 'email' || channel === 'both')) {
    if (!hasText(payload.guestEmail)) {
      errors.push('guestEmail is required for guest email notifications');
    }
  }

  if ((recipientType === 'guest' || recipientType === 'both') && (channel === 'sms' || channel === 'both')) {
    if (!hasText(payload.guestPhone)) {
      errors.push('guestPhone is required for guest sms notifications');
    }
  }

  if ((recipientType === 'host' || recipientType === 'both') && (channel === 'sms' || channel === 'both')) {
    if (!hasText(payload.hostPhone)) {
      errors.push('hostPhone is required for host sms notifications');
    }
  }

  return errors;
}

export function validateNotificationPayload(payload: Partial<NotificationPayload>): payload is NotificationPayload {
  return getNotificationPayloadValidationErrors(payload).length === 0;
}

export const defaultRules: AutomationRule[] = [
  {
    id: 'rule-checkin-reminder-j1',
    trigger: 'checkin_reminder_j1',
    channel: 'both',
    enabled: true,
    recipientType: 'guest',
    templateId: 'checkin_reminder_j1',
  },
  {
    id: 'rule-checkin-day',
    trigger: 'checkin_day',
    channel: 'both',
    enabled: true,
    recipientType: 'guest',
    templateId: 'checkin_day',
  },
  {
    id: 'rule-checkout-reminder',
    trigger: 'checkout_reminder',
    channel: 'both',
    enabled: true,
    recipientType: 'guest',
    templateId: 'checkout_reminder',
  },
  {
    id: 'rule-contract-signed',
    trigger: 'contract_signed',
    channel: 'email',
    enabled: true,
    recipientType: 'guest',
    templateId: 'contract_signed',
  },
  {
    id: 'rule-verification-complete',
    trigger: 'verification_complete',
    channel: 'email',
    enabled: true,
    recipientType: 'host',
    templateId: 'verification_complete',
  },
];

export function toggleRule(rules: AutomationRule[], ruleId: string): AutomationRule[] {
  return rules.map((rule) =>
    rule.id === ruleId
      ? {
          ...rule,
          enabled: !rule.enabled,
        }
      : rule,
  );
}
