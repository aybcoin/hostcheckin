import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Loader2, ShieldCheck } from 'lucide-react';
import { APP_BASE_URL } from '../lib/supabase';
import { fr } from '../lib/i18n/fr';

interface PublicBookingFormProps {
  propertyToken: string;
}

interface PropertyPreview {
  id: string;
  name: string;
  city: string;
  country: string;
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
          setError('Ce lien de réservation est invalide ou expiré.');
          setLoading(false);
          return;
        }
        const payload = await response.json();
        setProperty(payload.property as PropertyPreview);
        setError(null);
      } catch {
        setError('Impossible de charger ce lien de réservation pour le moment.');
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
          setError('Veuillez valider le CAPTCHA pour continuer.');
        } else {
          setError(payload.error || 'Impossible de créer la réservation.');
        }
        setSubmitting(false);
        return;
      }

      const payload = await response.json();
      const link = payload.unique_link as string;
      window.location.href = `${APP_BASE_URL}/checkin/${link}`;
    } catch {
      setError('Une erreur réseau est survenue. Veuillez réessayer.');
      setSubmitting(false);
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto mt-10 max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Chargement de la réservation…
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto mt-10 max-w-xl rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || 'Lien de réservation introuvable.'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-xl space-y-5 py-6">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Réservation en ligne</h1>
          <p className="mt-1 text-sm text-slate-600">
            {property.name} · {property.city}, {property.country}
          </p>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
            <ShieldCheck size={16} className="text-slate-700" />
            Vos informations sont traitées de manière sécurisée.
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="public-booking-full-name" className="text-xs font-medium text-slate-700">
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
                <label htmlFor="public-booking-email" className="text-xs font-medium text-slate-700">
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
                <label htmlFor="public-booking-phone" className="text-xs font-medium text-slate-700">
                  {fr.publicBooking.phone}
                </label>
                <input
                  id="public-booking-phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))}
                  className={inputClassName}
                  required
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="public-booking-guests" className="text-xs font-medium text-slate-700">
                  {fr.publicBooking.guestsCount}
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
                  <CalendarDays size={16} className="text-slate-500" aria-hidden="true" />
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
                <label htmlFor="public-booking-checkin" className="text-xs font-medium text-slate-700">
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
                <label htmlFor="public-booking-checkout" className="text-xs font-medium text-slate-700">
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
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">
                  CAPTCHA requis. Collez ici le jeton hCaptcha après validation.
                </p>
                <label htmlFor="public-booking-captcha" className="mt-2 block text-xs font-medium text-amber-800">
                  {fr.publicBooking.captchaToken}
                </label>
                <input
                  id="public-booking-captcha"
                  type="text"
                  value={form.captcha_token}
                  onChange={(event) => setForm((previous) => ({ ...previous, captcha_token: event.target.value }))}
                  className="mt-1 w-full rounded-lg border border-amber-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
                  required
                />
              </div>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!isValid || submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              Continuer vers le check-in
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
