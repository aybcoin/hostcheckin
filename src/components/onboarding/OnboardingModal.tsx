import { Bell, FileCheck, Home, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';
import { clsx } from '../../lib/clsx';
import {
  borderTokens,
  ctaTokens,
  inputTokens,
  stateFillTokens,
  surfaceTokens,
  textTokens,
} from '../../lib/design-tokens';
import { fr } from '../../lib/i18n/fr';
import { type OnboardingState, type OnboardingStep } from '../../lib/onboarding';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { Button } from '../ui/Button';

const NOTIF_EMAIL_KEY = 'hc_notif_email';
const NOTIF_SMS_KEY = 'hc_notif_sms';
const BREVO_KEY_STORAGE = 'hc_brevo_key';

type PropertyType = keyof typeof fr.onboarding.property.types;

const PROPERTY_TYPE_VALUES: PropertyType[] = ['apartment', 'house', 'studio', 'villa'];
const STEP_ORDER: Array<Exclude<OnboardingStep, 'done'>> = ['welcome', 'property', 'notifications'];

interface OnboardingModalProps {
  isOpen: boolean;
  hostId: string;
  state: OnboardingState;
  goToStep: (step: OnboardingStep) => void;
  complete: () => void;
  skip: () => void;
}

function readBooleanStorage(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') {
    return fallback;
  }

  const value = window.localStorage.getItem(key);
  if (value === null) {
    return fallback;
  }

  return value === 'true';
}

function writeBooleanStorage(key: string, value: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, String(value));
}

function getBrevoConfigured(): boolean {
  if (import.meta.env.VITE_BREVO_API_KEY || import.meta.env.BREVO_API_KEY) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const localBrevoKey = window.localStorage.getItem(BREVO_KEY_STORAGE);
  return Boolean(localBrevoKey && localBrevoKey.trim());
}

function getCurrentVisualStep(currentStep: OnboardingStep): Exclude<OnboardingStep, 'done'> {
  if (currentStep === 'done') {
    return 'notifications';
  }
  return currentStep;
}

export function OnboardingModal({ isOpen, hostId, state, goToStep, complete, skip }: OnboardingModalProps) {
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');
  const [isSavingProperty, setIsSavingProperty] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(() => readBooleanStorage(NOTIF_EMAIL_KEY, true));
  const [smsEnabled, setSmsEnabled] = useState(() => readBooleanStorage(NOTIF_SMS_KEY, false));

  const stepLabels = {
    welcome: fr.onboarding.steps.welcome,
    property: fr.onboarding.steps.property,
    notifications: fr.onboarding.steps.notifications,
  };

  const propertyTypeLabel = fr.onboarding.property.types[propertyType];

  const currentVisualStep = getCurrentVisualStep(state.currentStep);
  const currentStepIndex = STEP_ORDER.indexOf(currentVisualStep);
  const hasBrevoConfigured = useMemo(() => getBrevoConfigured(), []);

  if (!isOpen) {
    return null;
  }

  const handleSaveProperty = async () => {
    const sanitizedName = propertyName.trim().slice(0, 100);

    if (!sanitizedName) {
      toast.error('Le nom de la propriété est requis.');
      return;
    }

    setIsSavingProperty(true);

    try {
      const { error } = await supabase.from('properties').insert([
        {
          host_id: hostId,
          name: sanitizedName,
          address: propertyAddress.trim(),
          city: '',
          country: 'France',
          rooms_count: 1,
          bathrooms_count: 1,
          max_guests: 2,
          description: `Type: ${propertyTypeLabel}`,
          verification_mode: 'simple',
        },
      ]);

      if (error) {
        throw error;
      }

      toast.success('Propriété enregistrée.');
      goToStep('notifications');
    } catch {
      toast.error('Impossible d’enregistrer la propriété.');
    } finally {
      setIsSavingProperty(false);
    }
  };

  return (
    <div className={clsx('fixed inset-0 z-[90] flex items-center justify-center p-4', surfaceTokens.overlay)}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Configuration initiale"
        className={clsx(
          'w-full max-w-3xl rounded-2xl border shadow-2xl',
          surfaceTokens.panel,
          borderTokens.default,
        )}
      >
        <div className={clsx('border-b px-5 py-4 sm:px-6', borderTokens.default)}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {STEP_ORDER.map((stepId, index) => {
                const isActive = currentVisualStep === stepId;
                const isDone = state.completed || index < currentStepIndex;
                return (
                  <div key={stepId} className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
                          isDone || isActive ? stateFillTokens.neutral : surfaceTokens.muted,
                          textTokens.title,
                        )}
                      >
                        {index + 1}
                      </span>
                      <span className={clsx('text-sm', isActive ? textTokens.title : textTokens.muted)}>
                        {stepLabels[stepId]}
                      </span>
                    </div>
                    {index < STEP_ORDER.length - 1 ? (
                      <span className={clsx('h-px w-4', borderTokens.default)} aria-hidden="true" />
                    ) : null}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={skip}
              className={clsx('text-sm underline underline-offset-2', textTokens.muted)}
            >
              {fr.onboarding.skip}
            </button>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-6">
          {state.currentStep === 'welcome' ? (
            <div className="space-y-5">
              <div>
                <h2 className={clsx('text-2xl font-bold', textTokens.title)}>{fr.onboarding.welcome.title} 🏠</h2>
                <p className={clsx('mt-2', textTokens.muted)}>{fr.onboarding.welcome.subtitle}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className={clsx('rounded-lg border p-4', borderTokens.default, surfaceTokens.subtle)}>
                  <Shield size={18} className={textTokens.title} aria-hidden="true" />
                  <p className={clsx('mt-2 text-sm', textTokens.body)}>{fr.onboarding.welcome.benefit1}</p>
                </div>
                <div className={clsx('rounded-lg border p-4', borderTokens.default, surfaceTokens.subtle)}>
                  <Bell size={18} className={textTokens.title} aria-hidden="true" />
                  <p className={clsx('mt-2 text-sm', textTokens.body)}>{fr.onboarding.welcome.benefit2}</p>
                </div>
                <div className={clsx('rounded-lg border p-4', borderTokens.default, surfaceTokens.subtle)}>
                  <FileCheck size={18} className={textTokens.title} aria-hidden="true" />
                  <p className={clsx('mt-2 text-sm', textTokens.body)}>{fr.onboarding.welcome.benefit3}</p>
                </div>
              </div>

              <div>
                <Button variant="primary" onClick={() => goToStep('property')}>
                  {fr.onboarding.welcome.cta} →
                </Button>
              </div>
            </div>
          ) : null}

          {state.currentStep === 'property' ? (
            <div className="space-y-5">
              <div>
                <h2 className={clsx('text-2xl font-bold', textTokens.title)}>{fr.onboarding.property.title}</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="onboarding-property-name" className={clsx('mb-1 block text-sm font-medium', textTokens.body)}>
                    {fr.onboarding.property.nameLabel}
                  </label>
                  <input
                    id="onboarding-property-name"
                    type="text"
                    value={propertyName}
                    onChange={(event) => setPropertyName(event.target.value)}
                    maxLength={100}
                    required
                    placeholder={fr.onboarding.property.namePlaceholder}
                    className={inputTokens.base}
                  />
                </div>

                <div>
                  <label
                    htmlFor="onboarding-property-address"
                    className={clsx('mb-1 block text-sm font-medium', textTokens.body)}
                  >
                    {fr.onboarding.property.addressLabel}
                  </label>
                  <input
                    id="onboarding-property-address"
                    type="text"
                    value={propertyAddress}
                    onChange={(event) => setPropertyAddress(event.target.value)}
                    className={inputTokens.base}
                  />
                </div>

                <div>
                  <label htmlFor="onboarding-property-type" className={clsx('mb-1 block text-sm font-medium', textTokens.body)}>
                    {fr.onboarding.property.typeLabel}
                  </label>
                  <div className="relative">
                    <Home size={16} className={clsx('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2', textTokens.muted)} aria-hidden="true" />
                    <select
                      id="onboarding-property-type"
                      value={propertyType}
                      onChange={(event) => setPropertyType(event.target.value as PropertyType)}
                      className={clsx(inputTokens.base, 'pl-10')}
                    >
                      {PROPERTY_TYPE_VALUES.map((type) => (
                        <option key={type} value={type}>
                          {fr.onboarding.property.types[type]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" onClick={() => { void handleSaveProperty(); }} disabled={isSavingProperty}>
                  {isSavingProperty ? fr.onboarding.property.saving : fr.onboarding.property.cta} →
                </Button>
                <button
                  type="button"
                  onClick={() => goToStep('notifications')}
                  className={clsx('text-sm underline underline-offset-2', textTokens.muted)}
                >
                  {fr.onboarding.property.skip}
                </button>
              </div>
            </div>
          ) : null}

          {state.currentStep === 'notifications' ? (
            <div className="space-y-5">
              <div>
                <h2 className={clsx('text-2xl font-bold', textTokens.title)}>{fr.onboarding.notifications.title}</h2>
              </div>

              <div className="space-y-3">
                <label className={clsx('flex items-center gap-3 rounded-lg border p-3', borderTokens.default, surfaceTokens.subtle)}>
                  <input
                    type="checkbox"
                    checked={emailEnabled}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setEmailEnabled(checked);
                      writeBooleanStorage(NOTIF_EMAIL_KEY, checked);
                    }}
                    className={clsx('h-4 w-4 rounded', borderTokens.default)}
                  />
                  <span className={clsx('text-sm', textTokens.body)}>{fr.onboarding.notifications.emailLabel}</span>
                </label>

                <label className={clsx('flex items-center gap-3 rounded-lg border p-3', borderTokens.default, surfaceTokens.subtle)}>
                  <input
                    type="checkbox"
                    checked={smsEnabled}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSmsEnabled(checked);
                      writeBooleanStorage(NOTIF_SMS_KEY, checked);
                    }}
                    className={clsx('h-4 w-4 rounded', borderTokens.default)}
                  />
                  <span className={clsx('text-sm', textTokens.body)}>{fr.onboarding.notifications.smsLabel}</span>
                </label>
              </div>

              {!hasBrevoConfigured ? (
                <div className={clsx('rounded-lg border p-3 text-sm', borderTokens.warning, surfaceTokens.subtle, textTokens.muted)}>
                  {fr.onboarding.notifications.brevoHint}
                </div>
              ) : null}

              <div>
                <Button variant="primary" onClick={complete} className={ctaTokens.primary}>
                  {fr.onboarding.notifications.cta} →
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
