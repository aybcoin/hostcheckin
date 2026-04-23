export type AutomationTrigger =
  | 'checkin_reminder_j1'
  | 'checkin_day'
  | 'checkout_reminder'
  | 'contract_signed'
  | 'verification_complete';

export type NotificationChannel = 'email' | 'sms' | 'both';

export interface AutomationRule {
  id: string;
  trigger: AutomationTrigger;
  channel: NotificationChannel;
  enabled: boolean;
  recipientType: 'host' | 'guest' | 'both';
  templateId: string;
}

export interface NotificationLog {
  id: string;
  reservationId: string;
  trigger: AutomationTrigger;
  channel: NotificationChannel;
  recipient: string;
  status: 'sent' | 'failed' | 'pending' | 'skipped';
  sentAt: string | null;
  error: string | null;
}

export interface AutomationSettings {
  rules: AutomationRule[];
  hostEmail: string;
  hostPhone: string | null;
  senderName: string;
}
