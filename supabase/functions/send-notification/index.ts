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
  checkInTime?: string;
  checkOutTime?: string;
  smartLockCode?: string;
}

type MessageLocale = 'fr' | 'en' | 'ar' | 'darija';

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

interface MessageTemplateRow {
  id: string;
  host_id: string;
  trigger: Trigger;
  channel: SendChannel;
  locale: MessageLocale;
  subject: string | null;
  body: string;
  is_active: boolean;
  is_default: boolean;
}

interface ReservationTemplateContext {
  host_id: string;
  guest_country: string | null;
  guest_preferred_locale: MessageLocale | null;
  check_in_time: string | null;
  check_out_time: string | null;
  smart_lock_code: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, X-Brevo-Api-Key',
};

const ALLOWED_TRIGGERS: Trigger[] = [
  'checkin_reminder_j1',
  'checkin_day',
  'checkout_reminder',
  'contract_signed',
  'verification_complete',
];

const PLACEHOLDER_PATTERN = /\{([a-z0-9_]+)\}/gi;

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
      return `Rappel check-in — ${payload.propertyName}`;
    case 'checkin_day':
      return `Bienvenue à ${payload.propertyName} !`;
    case 'checkout_reminder':
      return `Votre séjour se termine demain — ${payload.propertyName}`;
    case 'contract_signed':
      return `Contrat signé — ${payload.propertyName}`;
    case 'verification_complete':
      return `Identité vérifiée — ${payload.guestName}`;
    default:
      return 'Notification HostCheckIn';
  }
}

function normalizeCountry(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function detectLocaleFromCountry(country: string | null | undefined): MessageLocale | null {
  const normalized = normalizeCountry(country);

  if (!normalized) return null;

  if ([
    'maroc',
    'morocco',
    'المغرب',
  ].includes(normalized)) {
    return 'darija';
  }

  if ([
    'france',
    'fr',
  ].includes(normalized)) {
    return 'fr';
  }

  if ([
    'united kingdom',
    'uk',
    'england',
    'ireland',
    'united states',
    'usa',
    'canada',
  ].includes(normalized)) {
    return 'en';
  }

  if ([
    'saudi arabia',
    'saudi',
    'uae',
    'united arab emirates',
    'qatar',
    'egypt',
    'jordan',
    'algeria',
    'tunisia',
    'arabie saoudite',
    'الامارات',
    'السعودية',
    'مصر',
  ].includes(normalized)) {
    return 'ar';
  }

  return null;
}

function resolveLocale(context: ReservationTemplateContext | null): MessageLocale {
  return context?.guest_preferred_locale
    ?? detectLocaleFromCountry(context?.guest_country)
    ?? 'fr';
}

function pickTemplate(
  templates: MessageTemplateRow[],
  channel: SendChannel,
  locale: MessageLocale,
): MessageTemplateRow | null {
  const scoped = templates.filter(
    (template) => template.channel === channel && template.is_active && template.is_default,
  );

  const exact = scoped.find((template) => template.locale === locale);
  if (exact) return exact;

  return scoped.find((template) => template.locale === 'fr') ?? null;
}

function renderText(
  text: string | null | undefined,
  variables: Record<string, string | undefined>,
): string | undefined {
  if (!text) return undefined;

  return text.replace(PLACEHOLDER_PATTERN, (rawMatch, rawKey: string) => {
    const key = rawKey.trim();
    const value = variables[key];
    return typeof value === 'string' ? value : rawMatch;
  });
}

function renderMessageTemplate(
  template: MessageTemplateRow,
  variables: Record<string, string | undefined>,
): { subject?: string; body: string } {
  return {
    subject: renderText(template.subject, variables),
    body: renderText(template.body, variables) ?? '',
  };
}

function buildTemplateVariables(
  payload: NotificationPayload,
  context: ReservationTemplateContext | null,
): Record<string, string | undefined> {
  return {
    guest_name: payload.guestName,
    property_name: payload.propertyName,
    check_in_date: payload.checkinDate,
    check_out_date: payload.checkoutDate,
    sender_name: payload.senderName,
    check_in_time: context?.check_in_time ?? payload.checkInTime,
    check_out_time: context?.check_out_time ?? payload.checkOutTime,
    smart_lock_code: context?.smart_lock_code ?? payload.smartLockCode,
  };
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

async function fetchReservationTemplateContext(
  supabase: ReturnType<typeof createClient>,
  reservationId: string,
): Promise<ReservationTemplateContext | null> {
  try {
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .select('property_id, guest_id, smart_lock_code')
      .eq('id', reservationId)
      .maybeSingle();

    if (reservationError || !reservation?.property_id || !reservation?.guest_id) {
      return null;
    }

    const [propertyResult, guestResult] = await Promise.all([
      supabase
        .from('properties')
        .select('host_id, check_in_time, check_out_time')
        .eq('id', reservation.property_id)
        .maybeSingle(),
      supabase
        .from('guests')
        .select('country, preferred_locale')
        .eq('id', reservation.guest_id)
        .maybeSingle(),
    ]);

    if (propertyResult.error || !propertyResult.data) {
      return null;
    }

    return {
      host_id: propertyResult.data.host_id as string,
      guest_country: (guestResult.data?.country as string | null | undefined) ?? null,
      guest_preferred_locale:
        (guestResult.data?.preferred_locale as MessageLocale | null | undefined) ?? null,
      check_in_time: (propertyResult.data.check_in_time as string | null | undefined) ?? null,
      check_out_time: (propertyResult.data.check_out_time as string | null | undefined) ?? null,
      smart_lock_code: (reservation.smart_lock_code as string | null | undefined) ?? null,
    };
  } catch (error) {
    console.error('Failed to fetch reservation template context', error);
    return null;
  }
}

async function fetchMessageTemplates(
  supabase: ReturnType<typeof createClient>,
  hostId: string,
  trigger: Trigger,
): Promise<MessageTemplateRow[]> {
  try {
    const { data, error } = await supabase
      .from('message_templates')
      .select('id, host_id, trigger, channel, locale, subject, body, is_active, is_default')
      .eq('host_id', hostId)
      .eq('trigger', trigger)
      .eq('is_active', true)
      .eq('is_default', true);

    if (error) {
      console.error('Failed to fetch message templates', error);
      return [];
    }

    return (data ?? []) as MessageTemplateRow[];
  } catch (error) {
    console.error('Failed to fetch message templates', error);
    return [];
  }
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

const BREVO_API_KEY_NOT_CONFIGURED = 'BREVO_API_KEY not configured';

function sanitizeBrevoSmsSender(senderName: string): string {
  const alphanumericSender = senderName.replace(/[^a-zA-Z0-9]/g, '');
  if (!alphanumericSender) {
    return 'HostCheckIn'.substring(0, 11);
  }
  return alphanumericSender.substring(0, 11);
}

function parseBrevoMessageId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const body = payload as Record<string, unknown>;
  const rawMessageId = body.messageId ?? body.id;

  if (typeof rawMessageId === 'string') {
    return rawMessageId;
  }

  if (typeof rawMessageId === 'number') {
    return String(rawMessageId);
  }

  return undefined;
}

function parseBrevoError(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  const body = payload as Record<string, unknown>;
  if (typeof body.message === 'string' && body.message.length > 0) {
    return body.message;
  }
  if (typeof body.code === 'string' && body.code.length > 0) {
    return body.code;
  }
  return undefined;
}

async function sendEmailWithBrevo(
  to: string,
  subject: string,
  message: string,
  payload: NotificationPayload,
  brevoApiKey: string | undefined,
): Promise<DeliveryOutcome> {
  if (!brevoApiKey) {
    return {
      status: 'skipped',
      reason: BREVO_API_KEY_NOT_CONFIGURED,
    };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: payload.senderName, email: payload.hostEmail },
        to: [{ email: to }],
        subject,
        textContent: message,
      }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        status: 'failed',
        error: parseBrevoError(body) || `brevo_email_http_${response.status}`,
      };
    }

    return {
      status: 'sent',
      messageId: parseBrevoMessageId(body),
    };
  } catch (error) {
    return {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function sendSmsWithBrevo(
  to: string,
  message: string,
  senderName: string,
  brevoApiKey: string | undefined,
): Promise<DeliveryOutcome> {
  if (!brevoApiKey) {
    return {
      status: 'skipped',
      reason: BREVO_API_KEY_NOT_CONFIGURED,
    };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'api-key': brevoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: sanitizeBrevoSmsSender(senderName),
        recipient: to,
        content: message,
        type: 'transactional',
      }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        status: 'failed',
        error: parseBrevoError(body) || `brevo_sms_http_${response.status}`,
      };
    }

    return {
      status: 'sent',
      messageId: parseBrevoMessageId(body),
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
  const requestBrevoApiKey = req.headers.get('x-brevo-api-key')?.trim();
  const brevoApiKey = requestBrevoApiKey || Deno.env.get('BREVO_API_KEY');
  const templateContext = isUuid(payload.reservationId)
    ? await fetchReservationTemplateContext(supabase, payload.reservationId)
    : null;
  const resolvedLocale = resolveLocale(templateContext);
  const messageTemplates = templateContext?.host_id
    ? await fetchMessageTemplates(supabase, templateContext.host_id, payload.trigger)
    : [];
  const templateVariables = buildTemplateVariables(payload, templateContext);

  const channels: SendChannel[] = payload.channel === 'both' ? ['email', 'sms'] : [payload.channel];
  const channelResults: ChannelResult[] = [];

  for (const channel of channels) {
    const recipients = resolveRecipients(payload, channel);

    if (!brevoApiKey) {
      for (const recipient of recipients) {
        const reservationId = isUuid(payload.reservationId) ? payload.reservationId : null;
        await insertNotificationLog(supabase, {
          reservation_id: reservationId,
          trigger: payload.trigger,
          channel,
          recipient,
          status: 'skipped',
          sent_at: null,
          error: BREVO_API_KEY_NOT_CONFIGURED,
        });
      }

      channelResults.push({
        channel,
        status: 'skipped',
        reason: BREVO_API_KEY_NOT_CONFIGURED,
      });
      continue;
    }

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
    const template = pickTemplate(messageTemplates, channel, resolvedLocale);
    const renderedTemplate = template ? renderMessageTemplate(template, templateVariables) : null;
    const message = renderedTemplate?.body || buildNotificationMessage(payload);
    const subject = renderedTemplate?.subject || buildEmailSubject(payload);

    for (const recipient of recipients) {
      const outcome = channel === 'email'
        ? await sendEmailWithBrevo(recipient, subject, message, payload, brevoApiKey)
        : await sendSmsWithBrevo(recipient, message, payload.senderName, brevoApiKey);

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
