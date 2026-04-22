import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Loader2, ShieldCheck } from 'lucide-react';
import { clsx } from '../lib/clsx';
import { borderTokens, inputTokens, statusTokens, surfaceTokens, textTokens } from '../lib/design-tokens';
import { APP_BASE_URL } from '../lib/supabase';
import { fr } from '../lib/i18n/fr';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface PublicBookingFormProps {
  propertyToken: string;
}

interface PropertyPreview {
  id: string;
  name: string;
  city: string;
  country: string;
  image_url?: string | null;
}

interface BookingFormState {
  full_name: string;
  email: string;
  phone: string;
  check_in_date: string;
  check_out_date: string;
  number_of_guests: number;
  captcha_token: string;
}

const EMPTY_FORM: BookingFormState = {
  full_name: '',
  email: '',
  phone: '',
  check_in_date: '',
  check_out_date: '',
  number_of_guests: 1,
  captcha_token: '',
};

function getApiUrl(token: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/functions/v1/public-booking?token=${encodeURIComponent(token)}`;
}

function getCsrfHeader(): Record<string, string> {
  const token = (import.meta.env.VITE_PUBLIC_BOOKING_CSRF_TOKEN || '').trim();
  if (!token) return {};
  return { 'X-Public-Booking-Csrf': token };
}

export function PublicBookingForm({ propertyToken }: PublicBookingFormProps) {
  const [property, setProperty] = useState<PropertyPreview | null>(null);
  const [form, setForm] = useState<BookingFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Réservation en ligne | HostCheckIn';

    const descriptionMeta = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionMeta?.getAttribute('content') || '';
    if (descriptionMeta) {
      descriptionMeta.setAttribute(
        'content',
        'Réservez votre séjour et lancez votre check-in sécurisé en quelques étapes.',
      );
    }

    return () => {
      document.title = previousTitle;
      if (descriptionMeta) {
        descriptionMeta.setAttribute('content', previousDescription);
      }
    };
  }, []);

  useEffect(() => {
    const fetchProperty = async () => {
      setLoading(true);
      try {
        const response = await fetch(getApiUrl(propertyToken), { method: 'GET' });
        if (!response.ok) {
          if (response.status === 410) {
            setError(fr.publicBooking.inactiveLink);
          } else {
            setError(fr.publicBooking.invalidLink);
          }
          setLoading(false);
          return;
        }
        const payload = await response.json();
        setProperty(payload.property as PropertyPreview);
        setError(null);
      } catch {
        setError(fr.publicBooking.unavailable);
      } finally {
        setLoading(false);
      }
    };

    void fetchProperty();
  }, [propertyToken]);

  const isValid = useMemo(() => {
    return Boolean(
      form.full_name.trim() &&
      form.email.trim() &&
      form.phone.trim() &&
      form.check_in_date &&
      form.check_out_date &&
      form.number_of_guests > 0 &&
      (!captchaRequired || form.captcha_token.trim()),
    );
  }, [captchaRequired, form]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      const response = await fetch(getApiUrl(propertyToken), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getCsrfHeader(),
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (payload.require_captcha) {
          setCaptchaRequired(true);
          setError(fr.publicBooking.captchaRequired);
        } else {
          setError(payload.error || fr.publicBooking.createError);
        }
        setSubmitting(false);
        return;
      }

      const payload = await response.json();
      const link = payload.unique_link as string;
      window.location.href = `${APP_BASE_URL}/checkin/${link}`;
    } catch {
      setError(fr.publicBooking.networkError);
      setSubmitting(false);
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName = inputTokens.base;

  if (loading) {
    return (
      <div className={clsx('min-h-screen p-4', surfaceTokens.app)}>
        <Card className={clsx('mx-auto mt-10 max-w-xl text-sm', textTokens.subtle)} padding="lg">
          {fr.publicBooking.loading}
        </Card>
      </div>
    );
  }

  if (!property) {
    return (
      <div className={clsx('min-h-screen p-4', surfaceTokens.app)}>
        <Card variant="danger" padding="lg" className={clsx('mx-auto mt-10 max-w-xl text-sm', textTokens.danger)}>
          {error || 'Lien de réservation introuvable.'}
        </Card>
      </div>
    );
  }

  return (
    <div className={clsx('min-h-screen p-4', surfaceTokens.app)}>
      <div className="mx-auto max-w-xl space-y-5 py-6">
        <header className={clsx('relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-sm', borderTokens.default)}>
          {property.image_url ? (
            <img
              src={property.image_url}
              alt={property.name}
              className="absolute inset-0 h-full w-full object-cover opacity-20"
            />
          ) : null}
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-wide text-white/80">{fr.app.brand}</p>
            <h1 className="text-2xl font-bold">{fr.publicBooking.pageTitle}</h1>
            <p className="mt-1 text-sm text-white/80">
              {property.name} · {property.city}, {property.country}
            </p>
          </div>
        </header>

        <Card as="section" variant="default" padding="md">
          <div className={clsx('mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium', borderTokens.default, surfaceTokens.subtle, textTokens.body)}>
            <ShieldCheck size={14} className={textTokens.body} />
            {fr.publicBooking.secureBadge}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="public-booking-full-name" className={clsx('text-xs font-medium', textTokens.body)}>
                  {fr.publicBooking.fullName}
                </label>
                <input
                  id="public-booking-full-name"
                  type="text"
                  autoComplete="name"
                  value={form.full_name}
                  onChange={(event) => setForm((previous) => ({ ...previous, full_name: event.target.value }))}
                  className={inputClassName}
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="public-booking-email" className={clsx('text-xs font-medium', textTokens.body)}>
                  {fr.publicBooking.email}
                </label>
                <input
                  id="public-booking-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))}
                  className={inputClassName}
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="public-booking-phone" className={clsx('text-xs font-medium', textTokens.body)}>
                  {fr.publicBooking.phone}
                </label>
                <input
                  id="public-booking-phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
                  className={inputClassName}
                  placeholder={fr.profile.phonePlaceholder}
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="public-booking-guests" className={clsx('text-xs font-medium', textTokens.body)}>
                  {fr.publicBooking.guestsCount}
                </label>
                <div className={clsx('flex items-center gap-2 rounded-lg border px-3 py-2', borderTokens.strong)}>
                  <CalendarDays size={16} className={textTokens.subtle} aria-hidden="true" />
                  <input
                    id="public-booking-guests"
                    type="number"
                    min={1}
                    value={form.number_of_guests}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        number_of_guests: Number(event.target.value) || 1,
                      }))
                    }
                    className="w-full bg-transparent text-sm outline-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="public-booking-checkin" className={clsx('text-xs font-medium', textTokens.body)}>
                  {fr.publicBooking.checkInDate}
                </label>
                <input
                  id="public-booking-checkin"
                  type="date"
                  value={form.check_in_date}
                  onChange={(event) => setForm((previous) => ({ ...previous, check_in_date: event.target.value }))}
                  className={inputClassName}
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="public-booking-checkout" className={clsx('text-xs font-medium', textTokens.body)}>
                  {fr.publicBooking.checkOutDate}
                </label>
                <input
                  id="public-booking-checkout"
                  type="date"
                  value={form.check_out_date}
                  onChange={(event) => setForm((previous) => ({ ...previous, check_out_date: event.target.value }))}
                  className={inputClassName}
                  required
                />
              </div>
            </div>

            {captchaRequired ? (
              <div className={clsx('rounded-lg p-3', statusTokens.warning)}>
                <p className="text-xs">
                  {fr.publicBooking.captchaHint}
                </p>
                <label htmlFor="public-booking-captcha" className="mt-2 block text-xs font-medium">
                  {fr.publicBooking.captchaToken}
                </label>
                <input
                  id="public-booking-captcha"
                  type="text"
                  value={form.captcha_token}
                  onChange={(event) => setForm((previous) => ({ ...previous, captcha_token: event.target.value }))}
                  className={clsx('mt-1', inputTokens.base)}
                  required
                />
              </div>
            ) : null}

            {error ? (
              <p className={clsx('rounded-lg px-3 py-2 text-sm', statusTokens.danger)} role="alert">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={!isValid || submitting}
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {fr.publicBooking.continue}
            </Button>
          </form>
          <p className={clsx('mt-4 text-center text-xs', textTokens.subtle)}>{fr.publicBooking.secureFooter}</p>
        </Card>
      </div>
    </div>
  );
}
