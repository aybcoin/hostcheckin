import type { AutomationTrigger } from './automations';

export type MessageLocale = 'fr' | 'en' | 'ar' | 'darija';
export type MessageChannel = 'email' | 'sms';

export const MESSAGE_LOCALES = [
  'fr',
  'en',
  'ar',
  'darija',
] as const satisfies readonly MessageLocale[];

export const MESSAGE_TRIGGERS = [
  'checkin_reminder_j1',
  'checkin_day',
  'checkout_reminder',
  'contract_signed',
  'verification_complete',
] as const satisfies readonly AutomationTrigger[];

export const MESSAGE_CHANNELS = [
  'email',
  'sms',
] as const satisfies readonly MessageChannel[];

export interface MessageTemplate {
  id: string;
  host_id: string;
  trigger: AutomationTrigger;
  channel: MessageChannel;
  locale: MessageLocale;
  subject: string | null;
  body: string;
  is_active: boolean;
  is_default: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplateWithRelations extends MessageTemplate {}

export interface MessageTemplateCreateInput {
  trigger: AutomationTrigger;
  channel: MessageChannel;
  locale: MessageLocale;
  subject?: string | null;
  body: string;
  is_active?: boolean;
  is_default?: boolean;
  notes?: string | null;
}

export interface MessageTemplateUpdateInput extends Partial<MessageTemplateCreateInput> {}

export interface MessageTemplateSeedInput extends MessageTemplateCreateInput {
  host_id: string;
}

export interface MessageVariable {
  key: string;
  description: string;
  example: string;
}

export interface RenderedMessage {
  subject?: string;
  body: string;
  missingVariables: string[];
}

export interface MessageTemplateDefaultGap {
  trigger: AutomationTrigger;
  channel: MessageChannel;
  locale: MessageLocale;
}

export interface MessageTemplateSummary {
  total: number;
  active: number;
  byTrigger: Record<AutomationTrigger, number>;
  byLocale: Record<MessageLocale, number>;
  missingDefaults: MessageTemplateDefaultGap[];
}
