import { useCallback, useEffect, useState } from 'react';
import {
  defaultRules,
  toggleRule as toggleRuleInMemory,
  validateNotificationPayload,
  type NotificationPayload,
} from '../lib/automations-logic';
import { supabase } from '../lib/supabase';
import type {
  AutomationRule,
  AutomationTrigger,
  NotificationChannel,
  NotificationLog,
} from '../types/automations';

export interface UseAutomationsReturn {
  rules: AutomationRule[];
  logs: NotificationLog[];
  isLoading: boolean;
  toggleRule: (ruleId: string) => Promise<void>;
  sendTestNotification: (trigger: AutomationTrigger, channel: NotificationChannel) => Promise<void>;
  isSending: boolean;
}

interface NotificationLogRow {
  id: string;
  reservation_id: string | null;
  trigger: string;
  channel: 'email' | 'sms';
  recipient: string;
  status: 'sent' | 'failed' | 'pending' | 'skipped';
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

interface ReservationForTest {
  id: string;
  property_id: string;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
}

interface GuestForTest {
  full_name: string;
  email: string | null;
  phone: string | null;
}

interface PropertyForTest {
  name: string;
}

const STORAGE_KEY = 'hostcheckin:automations:rules:v1';

function isAutomationTrigger(value: string): value is AutomationTrigger {
  return [
    'checkin_reminder_j1',
    'checkin_day',
    'checkout_reminder',
    'contract_signed',
    'verification_complete',
  ].includes(value);
}

function loadPersistedRules(): AutomationRule[] {
  const fallback = defaultRules;

  if (typeof window === 'undefined') {
    return fallback;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as AutomationRule[];
    if (!Array.isArray(parsed)) {
      return fallback;
    }

    return fallback.map((rule) => {
      const storedRule = parsed.find((item) => item.id === rule.id);
      if (!storedRule) {
        return rule;
      }

      return {
        ...rule,
        enabled: typeof storedRule.enabled === 'boolean' ? storedRule.enabled : rule.enabled,
        channel: storedRule.channel || rule.channel,
        recipientType: storedRule.recipientType || rule.recipientType,
      };
    });
  } catch {
    return fallback;
  }
}

function persistRules(rules: AutomationRule[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

function getFutureDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

export function useAutomations(): UseAutomationsReturn {
  const [rules, setRules] = useState<AutomationRule[]>(() => loadPersistedRules());
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('id, reservation_id, trigger, channel, recipient, status, sent_at, error, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      const rows = (data || []) as NotificationLogRow[];
      const mapped: NotificationLog[] = rows
        .filter((row) => isAutomationTrigger(row.trigger))
        .map((row) => ({
          id: row.id,
          reservationId: row.reservation_id || '',
          trigger: row.trigger as AutomationTrigger,
          channel: row.channel,
          recipient: row.recipient,
          status: row.status,
          sentAt: row.sent_at || row.created_at || null,
          error: row.error,
        }));

      setLogs(mapped);
    } catch (error) {
      console.error('Failed to load automation logs:', error);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const toggleRule = useCallback(async (ruleId: string) => {
    setRules((previous) => {
      const next = toggleRuleInMemory(previous, ruleId);
      persistRules(next);
      return next;
    });
  }, []);

  const sendTestNotification = useCallback(async (trigger: AutomationTrigger, channel: NotificationChannel) => {
    setIsSending(true);

    try {
      const [sessionResponse, userResponse, reservationResponse] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
        supabase
          .from('reservations')
          .select('id, property_id, guest_id, check_in_date, check_out_date')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const reservation = (reservationResponse.data || null) as ReservationForTest | null;
      let guest: GuestForTest | null = null;
      let property: PropertyForTest | null = null;

      if (reservation?.guest_id && reservation?.property_id) {
        const [guestResponse, propertyResponse] = await Promise.all([
          supabase
            .from('guests')
            .select('full_name, email, phone')
            .eq('id', reservation.guest_id)
            .maybeSingle(),
          supabase
            .from('properties')
            .select('name')
            .eq('id', reservation.property_id)
            .maybeSingle(),
        ]);

        guest = (guestResponse.data || null) as GuestForTest | null;
        property = (propertyResponse.data || null) as PropertyForTest | null;
      }

      const matchedRule = rules.find((rule) => rule.trigger === trigger);
      const currentUser = userResponse.data.user;
      const hostEmail = currentUser?.email || 'host@example.com';
      const senderName = typeof currentUser?.user_metadata?.full_name === 'string'
        ? currentUser.user_metadata.full_name
        : 'HostCheckIn';
      const guestEmail = guest?.email || hostEmail;
      const guestPhone = guest?.phone || undefined;
      const hostPhone = typeof currentUser?.phone === 'string' && currentUser.phone.length > 0
        ? currentUser.phone
        : undefined;

      const payload: NotificationPayload = {
        reservationId: reservation?.id || crypto.randomUUID(),
        trigger,
        channel,
        recipientType: matchedRule?.recipientType || 'both',
        guestName: guest?.full_name || 'Voyageur test',
        guestEmail,
        guestPhone,
        propertyName: property?.name || 'Logement test',
        checkinDate: reservation?.check_in_date || getFutureDate(1),
        checkoutDate: reservation?.check_out_date || getFutureDate(3),
        hostEmail,
        hostPhone,
        senderName,
      };

      if (!validateNotificationPayload(payload)) {
        throw new Error('Payload de test invalide');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (supabaseAnonKey) {
        headers.apikey = supabaseAnonKey;
      }

      const accessToken = sessionResponse.data.session?.access_token;
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null) as
        | { error?: string; details?: string[] }
        | null;

      if (!response.ok) {
        const detail = result?.details?.join(', ');
        throw new Error(detail || result?.error || 'Échec de l’envoi du test');
      }

      await fetchLogs();
    } finally {
      setIsSending(false);
    }
  }, [fetchLogs, rules]);

  return {
    rules,
    logs,
    isLoading,
    toggleRule,
    sendTestNotification,
    isSending,
  };
}
