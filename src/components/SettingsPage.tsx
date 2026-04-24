import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { clsx } from '../lib/clsx';
import { borderTokens, inputTokens, textTokens } from '../lib/design-tokens';
import { fr } from '../lib/i18n/fr';
import { APP_PAGE_PATHS } from '../lib/navigation';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

const t = fr.settings;

const STORAGE_KEYS = {
  emailEnabled: 'hc_notif_email',
  smsEnabled: 'hc_notif_sms',
  senderName: 'hc_sender_name',
  hostEmail: 'hc_host_email',
  hostPhone: 'hc_host_phone',
  brevoKey: 'hc_brevo_key',
} as const;

interface SettingsState {
  emailEnabled: boolean;
  smsEnabled: boolean;
  senderName: string;
  hostEmail: string;
  hostPhone: string;
  brevoKey: string;
}

function readBooleanStorage(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === 'true';
}

function readStringStorage(key: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

function sanitizeSenderName(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 11);
}

function getFutureDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>(() => ({
    emailEnabled: readBooleanStorage(STORAGE_KEYS.emailEnabled, true),
    smsEnabled: readBooleanStorage(STORAGE_KEYS.smsEnabled, false),
    senderName: readStringStorage(STORAGE_KEYS.senderName, 'HostCheckIn'),
    hostEmail: readStringStorage(STORAGE_KEYS.hostEmail),
    hostPhone: readStringStorage(STORAGE_KEYS.hostPhone),
    brevoKey: readStringStorage(STORAGE_KEYS.brevoKey),
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showBrevoKey, setShowBrevoKey] = useState(false);
  const [accountEmail, setAccountEmail] = useState('—');
  const [accountCreatedAt, setAccountCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;

      const authUser = data.user;
      const userEmail = authUser?.email ?? '';

      setAccountEmail(userEmail || '—');
      setAccountCreatedAt(authUser?.created_at ?? null);
      setSettings((previous) => ({
        ...previous,
        hostEmail: previous.hostEmail || userEmail,
      }));
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const accountCreatedDate = useMemo(() => {
    if (!accountCreatedAt) return '—';
    const date = new Date(accountCreatedAt);
    if (!Number.isFinite(date.getTime())) return '—';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, [accountCreatedAt]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const nextSenderName = sanitizeSenderName(settings.senderName);
      const nextSettings = {
        ...settings,
        senderName: nextSenderName,
        hostEmail: settings.hostEmail.trim(),
        hostPhone: settings.hostPhone.trim(),
        brevoKey: settings.brevoKey.trim(),
      };

      setSettings(nextSettings);
      window.localStorage.setItem(STORAGE_KEYS.emailEnabled, String(nextSettings.emailEnabled));
      window.localStorage.setItem(STORAGE_KEYS.smsEnabled, String(nextSettings.smsEnabled));
      window.localStorage.setItem(STORAGE_KEYS.senderName, nextSettings.senderName);
      window.localStorage.setItem(STORAGE_KEYS.hostEmail, nextSettings.hostEmail);
      window.localStorage.setItem(STORAGE_KEYS.hostPhone, nextSettings.hostPhone);
      window.localStorage.setItem(STORAGE_KEYS.brevoKey, nextSettings.brevoKey);
      toast.success(fr.toast.settingsSaved);
    } catch {
      toast.error(fr.toast.settingsError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.hostEmail.trim() || !settings.brevoKey.trim()) {
      toast.error(fr.toast.connectionError);
      return;
    }

    setIsTesting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl) {
        throw new Error('Missing Supabase URL');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-brevo-api-key': settings.brevoKey.trim(),
      };

      if (supabaseAnonKey) {
        headers.apikey = supabaseAnonKey;
      }

      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const payload = {
        reservationId: createRequestId(),
        trigger: 'checkin_day',
        channel: 'email',
        recipientType: 'host',
        guestName: 'Voyageur test',
        guestEmail: settings.hostEmail.trim(),
        propertyName: 'Logement test',
        checkinDate: getFutureDate(1),
        checkoutDate: getFutureDate(2),
        hostEmail: settings.hostEmail.trim(),
        hostPhone: settings.hostPhone.trim() || undefined,
        senderName: sanitizeSenderName(settings.senderName || 'HostCheckIn'),
      };

      const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null) as
        | { error?: string; details?: string[]; results?: Array<{ status?: string }> }
        | null;

      if (!response.ok) {
        throw new Error(result?.error || fr.toast.connectionError);
      }

      const statuses = result?.results?.map((item) => item.status || 'failed') || [];
      const allSent = statuses.length > 0 && statuses.every((status) => status === 'sent');

      if (!allSent) {
        throw new Error(fr.toast.connectionError);
      }

      toast.success(fr.toast.connectionSuccess);
    } catch {
      toast.error(fr.toast.connectionError);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div role="main" className="space-y-6">
      <header>
        <h1 className={clsx('text-2xl sm:text-3xl font-bold', textTokens.title)}>{t.pageTitle}</h1>
        <p className={clsx('mt-1', textTokens.muted)}>{t.pageDescription}</p>
      </header>

      <Card role="region" aria-label={t.sections.notifications} variant="default" padding="lg" className="space-y-4">
        <h2 className={clsx('text-lg font-semibold', textTokens.title)}>{t.sections.notifications}</h2>

        <div className="space-y-3">
          <label htmlFor="settings-email-enabled" className={clsx('inline-flex items-center gap-2 text-sm', textTokens.body)}>
            <input
              id="settings-email-enabled"
              type="checkbox"
              checked={settings.emailEnabled}
              onChange={(event) => setSettings((previous) => ({ ...previous, emailEnabled: event.target.checked }))}
              className={clsx('h-4 w-4 rounded', borderTokens.default)}
            />
            <span>{t.fields.emailEnabled}</span>
          </label>

          <label htmlFor="settings-sms-enabled" className={clsx('inline-flex items-center gap-2 text-sm', textTokens.body)}>
            <input
              id="settings-sms-enabled"
              type="checkbox"
              checked={settings.smsEnabled}
              onChange={(event) => setSettings((previous) => ({ ...previous, smsEnabled: event.target.checked }))}
              className={clsx('h-4 w-4 rounded', borderTokens.default)}
            />
            <span>{t.fields.smsEnabled}</span>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="settings-sender-name" className={clsx('mb-1 block text-sm font-medium', textTokens.body)}>
              {t.fields.senderName}
            </label>
            <input
              id="settings-sender-name"
              type="text"
              value={settings.senderName}
              onChange={(event) => setSettings((previous) => ({
                ...previous,
                senderName: sanitizeSenderName(event.target.value),
              }))}
              className={inputTokens.base}
              maxLength={11}
            />
            <p className={clsx('mt-1 text-xs', textTokens.muted)}>{t.hints.senderName}</p>
          </div>

          <div>
            <label htmlFor="settings-host-email" className={clsx('mb-1 block text-sm font-medium', textTokens.body)}>
              {t.fields.hostEmail}
            </label>
            <input
              id="settings-host-email"
              type="email"
              value={settings.hostEmail}
              onChange={(event) => setSettings((previous) => ({ ...previous, hostEmail: event.target.value }))}
              className={inputTokens.base}
            />
          </div>
        </div>

        <div>
          <label htmlFor="settings-host-phone" className={clsx('mb-1 block text-sm font-medium', textTokens.body)}>
            {t.fields.hostPhone}
          </label>
          <input
            id="settings-host-phone"
            type="tel"
            value={settings.hostPhone}
            onChange={(event) => setSettings((previous) => ({ ...previous, hostPhone: event.target.value }))}
            className={inputTokens.base}
            placeholder="+33..."
          />
        </div>

        <div>
          <Button
            variant="primary"
            onClick={() => {
              void handleSave();
            }}
            disabled={isSaving}
          >
            {isSaving ? t.actions.saving : t.actions.save}
          </Button>
        </div>
      </Card>

      <Card role="region" aria-label={t.sections.provider} variant="default" padding="lg" className="space-y-4">
        <h2 className={clsx('text-lg font-semibold', textTokens.title)}>{t.sections.provider}</h2>

        <div>
          <label htmlFor="settings-brevo-key" className={clsx('mb-1 block text-sm font-medium', textTokens.body)}>
            {t.fields.brevoKey}
          </label>
          <div className="relative">
            <input
              id="settings-brevo-key"
              type={showBrevoKey ? 'text' : 'password'}
              value={settings.brevoKey}
              onChange={(event) => setSettings((previous) => ({ ...previous, brevoKey: event.target.value }))}
              className={clsx(inputTokens.base, 'pr-11')}
            />
            <button
              type="button"
              onClick={() => setShowBrevoKey((previous) => !previous)}
              aria-label={showBrevoKey ? 'Masquer la clé API' : 'Afficher la clé API'}
              className={clsx(
                'absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1.5',
                'focus-visible:outline-none focus-visible:ring-2',
                textTokens.muted,
              )}
            >
              {showBrevoKey ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            </button>
          </div>
          <p className={clsx('mt-2 text-sm', textTokens.muted)}>
            Cette clé est stockée localement sur votre navigateur et utilisée pour les envois de test.
            Pour la production, ajoutez-la dans Supabase Edge Functions Secrets.
          </p>
          <p className={clsx('mt-1 text-xs', textTokens.muted)}>{t.hints.brevoKey}</p>
        </div>

        <a
          href="https://app.brevo.com/settings/keys/api"
          target="_blank"
          rel="noopener"
          className={clsx('inline-block text-sm underline underline-offset-2', textTokens.info)}
        >
          {t.actions.getBrevoKey}
        </a>

        <div>
          <Button
            variant="secondary"
            onClick={() => {
              void handleTestConnection();
            }}
            disabled={isTesting}
          >
            {isTesting ? t.actions.testing : t.actions.testConnection}
          </Button>
        </div>
      </Card>

      <Card role="region" aria-label={t.sections.account} variant="default" padding="lg" className="space-y-4">
        <h2 className={clsx('text-lg font-semibold', textTokens.title)}>{t.sections.account}</h2>

        <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div className={clsx('rounded-lg border p-3', borderTokens.default)}>
            <dt className={clsx('text-xs uppercase', textTokens.muted)}>Email actuel</dt>
            <dd className={clsx('mt-1', textTokens.body)}>{accountEmail}</dd>
          </div>
          <div className={clsx('rounded-lg border p-3', borderTokens.default)}>
            <dt className={clsx('text-xs uppercase', textTokens.muted)}>Date d&apos;inscription</dt>
            <dd className={clsx('mt-1', textTokens.body)}>{accountCreatedDate}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <a href={APP_PAGE_PATHS.profile} className={clsx('text-sm underline underline-offset-2', textTokens.info)}>
            {t.actions.manageProfile}
          </a>
          <a href={APP_PAGE_PATHS.security} className={clsx('text-sm underline underline-offset-2', textTokens.info)}>
            {fr.profile.sections.security}
          </a>
        </div>
      </Card>
    </div>
  );
}
