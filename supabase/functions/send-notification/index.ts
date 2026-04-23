import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationPayload {
  reservationId: string;
  trigger: string;
  channel: 'email' | 'sms' | 'both';
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

type DeliveryStatus = 'sent' | 'failed' | 'pending' | 'skipped';

type SendChannel = 'email' | 'sms';

type Trigger =
  | 'checkin_reminder_j1'
  | 'checkin_day'
  | 'checkout_reminder'
  | 'contract_signed'
  | 'verification_complete';

interface ChannelResult {
  channel: SendChannel;
  status: DeliveryStatus;
  messageId?: string;
  reason?: string;
  error?: string;
}

interface DeliveryOutcome {
  status: DeliveryStatus;
  messageId?: string;
  reason?: string;
  error?: string;
}

interface NotificationLogInsert {
  reservation_id: string | null;
  trigger: Trigger;
  channel: SendChannel;
  recipient: string;
  status: DeliveryStatus;
  sent_at: string | null;
  error: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const ALLOWED_TRIGGERS: Trigger[] = [
  'checkin_reminder_j1',
  'checkin_day',
  'checkout_reminder',
  'contract_signed',
  'verification_complete',
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTrigger(value: unknown): value is Trigger {
  return typeof value === 'string' && ALLOWED_TRIGGERS.includes(value as Trigger);
}

function isChannel(value: unknown): value is 'email' | 'sms' | 'both' {
  return value === 'email' || value === 'sms' || value === 'both';
}

function isRecipientType(value: unknown): value is 'host' | 'guest' | 'both' {
  return value === 'host' || value === 'guest' || value === 'both';
}

function validateNotificationPayload(payload: Partial<NotificationPayload>): string[] {
  const errors: string[] = [];

  if (!isNonEmptyString(payload.reservationId)) {
    errors.push('reservationId is required');
  }

  if (!isTrigger(payload.trigger)) {
    errors.push('trigger is invalid');
  }

  if (!isChannel(payload.channel)) {
    errors.push('channel is invalid');
  }

  if (!isRecipientType(payload.recipientType)) {
    errors.push('recipientType is invalid');
  }

  if (!isNonEmptyString(payload.guestName)) {
    errors.push('guestName is required');
  }

  if (!isNonEmptyString(payload.propertyName)) {
    errors.push('propertyName is required');
  }

  if (!isNonEmptyString(payload.checkinDate)) {
    errors.push('checkinDate is required');
  }

  if (!isNonEmptyString(payload.checkoutDate)) {
    errors.push('checkoutDate is required');
  }

  if (!isNonEmptyString(payload.hostEmail)) {
    errors.push('hostEmail is required');
  }

  if (!isNonEmptyString(payload.senderName)) {
    errors.push('senderName is required');
  }

  return errors;
}

function buildNotificationMessage(payload: NotificationPayload): string {
  switch (payload.trigger) {
    case 'checkin_reminder_j1':
      return `Bonjour ${payload.guestName}, votre arrivée à ${payload.propertyName} est demain. Check-in prévu le ${payload.checkinDate}. N'hésitez pas à nous contacter.`;
    case 'checkin_day':
      return `Bonjour ${payload.guestName}, bienvenue ! Votre check-in à ${payload.propertyName} est aujourd'hui. Nous sommes disponibles pour vous accueillir.`;
    case 'checkout_reminder':
      return `Bonjour ${payload.guestName}, votre séjour à ${payload.propertyName} se termine demain. Check-out prévu le ${payload.checkoutDate}. Merci pour votre confiance.`;
    case 'contract_signed':
      return `Bonjour ${payload.guestName}, votre contrat de séjour pour ${payload.propertyName} a bien été signé. Bonne préparation !`;
    case 'verification_complete':
      return `Bonjour ${payload.senderName}, l'identité de ${payload.guestName} pour ${payload.propertyName} vient d'être vérifiée avec succès.`;
    default:
      return `Bonjour ${payload.guestName}, une mise à jour est disponible pour votre réservation à ${payload.propertyName}.`;
  }
}

function buildEmailSubject(payload: NotificationPayload): string {
  switch (payload.trigger) {
    case 'checkin_reminder_j1':
      return `Rappel check-in demain - ${payload.propertyName}`;
    case 'checkin_day':
      return `Bienvenue - check-in aujourd'hui à ${payload.propertyName}`;
    case 'checkout_reminder':
      return `Rappel check-out demain - ${payload.propertyName}`;
    case 'contract_signed':
      return `Contrat signé - ${payload.propertyName}`;
    case 'verification_complete':
      return `Identité vérifiée - ${payload.propertyName}`;
    default:
      return 'Notification HostCheckIn';
  }
}

function resolveRecipients(payload: NotificationPayload, channel: SendChannel): string[] {
  const recipients = new Set<string>();

  if (payload.recipientType === 'host' || payload.recipientType === 'both') {
    if (channel === 'email' && isNonEmptyString(payload.hostEmail)) {
      recipients.add(payload.hostEmail.trim());
    }
    if (channel === 'sms' && isNonEmptyString(payload.hostPhone)) {
      recipients.add(payload.hostPhone.trim());
    }
  }

  if (payload.recipientType === 'guest' || payload.recipientType === 'both') {
    if (channel === 'email' && isNonEmptyString(payload.guestEmail)) {
      recipients.add(payload.guestEmail.trim());
    }
    if (channel === 'sms' && isNonEmptyString(payload.guestPhone)) {
      recipients.add(payload.guestPhone.trim());
    }
  }

  return Array.from(recipients);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function insertNotificationLog(
  supabase: ReturnType<typeof createClient>,
  row: NotificationLogInsert,
): Promise<void> {
  const { error } = await supabase.from('notification_logs').insert(row);
  if (!error) return;

  if (row.reservation_id) {
    const fallback = {
      ...row,
      reservation_id: null,
      error: row.error ? `${row.error} | LOG_WITHOUT_RESERVATION` : 'LOG_WITHOUT_RESERVATION',
    };

    const { error: fallbackError } = await supabase.from('notification_logs').insert(fallback);
    if (!fallbackError) return;
    console.error('notification_logs insert failed (fallback)', fallbackError);
    return;
  }

  console.error('notification_logs insert failed', error);
}

async function sendEmailWithResend(
  to: string,
  subject: string,
  message: string,
  senderName: string,
): Promise<DeliveryOutcome> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'HostCheckIn <onboarding@resend.dev>';

  if (!resendApiKey) {
    console.error('EMAIL_PROVIDER_NOT_CONFIGURED');
    return {
      status: 'skipped',
      reason: 'no_provider',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFromEmail,
        to: [to],
        subject,
        text: message,
        reply_to: undefined,
        headers: {
          'X-HostCheckIn-Sender': senderName,
        },
      }),
    });

    const body = await response.json().catch(() => null) as { id?: string; message?: string } | null;

    if (!response.ok) {
      return {
        status: 'failed',
        error: body?.message || `resend_http_${response.status}`,
      };
    }

    return {
      status: 'sent',
      messageId: body?.id,
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function sendSmsWithTwilio(to: string, message: string): Promise<DeliveryOutcome> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_FROM_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    console.error('SMS_PROVIDER_NOT_CONFIGURED');
    return {
      status: 'skipped',
      reason: 'no_provider',
    };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const authHeader = `Basic ${btoa(`${accountSid}:${authToken}`)}`;

    const formData = new URLSearchParams();
    formData.set('To', to);
    formData.set('From', fromNumber);
    formData.set('Body', message);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const body = await response.json().catch(() => null) as { sid?: string; message?: string } | null;

    if (!response.ok) {
      return {
        status: 'failed',
        error: body?.message || `twilio_http_${response.status}`,
      };
    }

    return {
      status: 'sent',
      messageId: body?.sid,
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function aggregateStatus(outcomes: DeliveryOutcome[]): DeliveryStatus {
  if (outcomes.some((outcome) => outcome.status === 'failed')) {
    return 'failed';
  }

  if (outcomes.some((outcome) => outcome.status === 'sent')) {
    return 'sent';
  }

  if (outcomes.some((outcome) => outcome.status === 'pending')) {
    return 'pending';
  }

  return 'skipped';
}

function response(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return response(405, { error: 'method_not_allowed' });
  }

  let payload: NotificationPayload;
  try {
    payload = await req.json() as NotificationPayload;
  } catch {
    return response(400, { error: 'invalid_json_payload' });
  }

  const validationErrors = validateNotificationPayload(payload);
  if (validationErrors.length > 0 || !isTrigger(payload.trigger)) {
    return response(400, {
      error: 'invalid_payload',
      details: validationErrors,
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return response(500, { error: 'supabase_env_missing' });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const message = buildNotificationMessage(payload);
  const subject = buildEmailSubject(payload);

  const channels: SendChannel[] = payload.channel === 'both' ? ['email', 'sms'] : [payload.channel];
  const channelResults: ChannelResult[] = [];

  for (const channel of channels) {
    const recipients = resolveRecipients(payload, channel);

    if (recipients.length === 0) {
      channelResults.push({
        channel,
        status: 'failed',
        error: 'no_recipient_for_channel',
      });
      continue;
    }

    const outcomes: DeliveryOutcome[] = [];
    const messageIds: string[] = [];

    for (const recipient of recipients) {
      const outcome = channel === 'email'
        ? await sendEmailWithResend(recipient, subject, message, payload.senderName)
        : await sendSmsWithTwilio(recipient, message);

      outcomes.push(outcome);

      if (outcome.messageId) {
        messageIds.push(outcome.messageId);
      }

      const sentAt = outcome.status === 'sent' ? new Date().toISOString() : null;
      const reservationId = isUuid(payload.reservationId) ? payload.reservationId : null;

      await insertNotificationLog(supabase, {
        reservation_id: reservationId,
        trigger: payload.trigger,
        channel,
        recipient,
        status: outcome.status,
        sent_at: sentAt,
        error: outcome.error || outcome.reason || null,
      });
    }

    const status = aggregateStatus(outcomes);
    channelResults.push({
      channel,
      status,
      messageId: messageIds[0],
      reason: outcomes.find((outcome) => outcome.reason)?.reason,
      error: outcomes.find((outcome) => outcome.error)?.error,
    });
  }

  return response(200, {
    success: true,
    results: channelResults,
  });
});
