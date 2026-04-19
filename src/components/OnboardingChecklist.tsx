import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  CircleDot,
  FileText,
  Home,
  Lock,
  QrCode,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { AppPage } from '../lib/navigation';
import type { Property } from '../lib/supabase';
import { useOnboardingSteps, type OnboardingViewStep } from '../hooks/useOnboardingSteps';
import { fr } from '../lib/i18n/fr';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface OnboardingChecklistProps {
  hostId: string | null;
  properties: Property[];
  onNavigate: (page: AppPage) => void;
  className?: string;
}

export interface OnboardingChecklistCardProps {
  hostId: string | null;
  steps: OnboardingViewStep[];
  loading: boolean;
  error: string | null;
  isComplete: boolean;
  completedCount: number;
  onNavigate: (page: AppPage) => void;
  className?: string;
}

const iconMap = {
  'shield-check': ShieldCheck,
  home: Home,
  'file-text': FileText,
  'qr-code': QrCode,
} as const;

function stepIconByName(iconName: string) {
  return iconMap[iconName as keyof typeof iconMap] || CircleDot;
}

export function OnboardingChecklist({
  hostId,
  properties,
  onNavigate,
  className = '',
}: OnboardingChecklistProps) {
  // HYPOTHESIS: current project is a Vite client app (no Next.js App Router),
  // so we keep a thin client container and isolate presentational rendering.
  const {
    steps,
    loading,
    error,
    isComplete,
    completedCount,
  } = useOnboardingSteps({ hostId, properties });

  return (
    <OnboardingChecklistCard
      hostId={hostId}
      steps={steps}
      loading={loading}
      error={error}
      isComplete={isComplete}
      completedCount={completedCount}
      onNavigate={onNavigate}
      className={className}
    />
  );
}

export function OnboardingChecklistCard({
  hostId,
  steps,
  loading,
  error,
  isComplete,
  completedCount,
  onNavigate,
  className = '',
}: OnboardingChecklistCardProps) {

  const calBookingUrl = useMemo(() => {
    const env = import.meta.env as Record<string, string | undefined>;
    return env.NEXT_PUBLIC_CAL_BOOKING_URL || env.VITE_CAL_BOOKING_URL || '';
  }, []);

  const [showCompletedBanner, setShowCompletedBanner] = useState(true);
  const [showChecklistReview, setShowChecklistReview] = useState(false);

  useEffect(() => {
    if (!hostId) return;
    const dismissed = window.localStorage.getItem(`hc:onboarding:completed-banner:${hostId}`);
    setShowCompletedBanner(dismissed !== '1');
  }, [hostId]);

  const dismissCompletedBanner = () => {
    if (hostId) {
      window.localStorage.setItem(`hc:onboarding:completed-banner:${hostId}`, '1');
    }
    setShowCompletedBanner(false);
  };

  const openCalBooking = () => {
    if (!calBookingUrl) return;
    window.open(calBookingUrl, '_blank', 'noopener,noreferrer');
  };

  const goToHelp = () => {
    onNavigate('help');
  };

  const runStepAction = (stepPage: string | null | undefined, externalUrl: string | null | undefined) => {
    if (externalUrl) {
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!stepPage) return;
    onNavigate(stepPage as AppPage);
  };

  if (loading) {
    return (
      <Card className={`p-5 ${className}`} data-testid="onboarding-checklist-loading">
        <p className="text-sm text-slate-500">{fr.onboarding.loading}</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-5 ${className}`} data-testid="onboarding-checklist-error">
        <p className="text-sm text-red-700">{error}</p>
      </Card>
    );
  }

  if (steps.length === 0) {
    return null;
  }

  if (isComplete && !showChecklistReview) {
    if (!showCompletedBanner) return null;
    return (
      <Card className={`p-4 ${className}`} data-testid="onboarding-complete-banner">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{fr.onboarding.completedBanner}</p>
            <button
              type="button"
              onClick={() => setShowChecklistReview(true)}
              data-testid="onboarding-review-link"
              className="mt-1 text-xs font-medium text-slate-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              {fr.onboarding.reviewLink}
            </button>
          </div>
          <button
            type="button"
            onClick={dismissCompletedBanner}
            aria-label={fr.onboarding.dismissBannerAria}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <X size={16} />
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-5 ${className}`} data-testid="onboarding-checklist">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{fr.onboarding.title(fr.app.brand)}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {fr.onboarding.subtitle}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {fr.onboarding.progress(completedCount, steps.length)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={openCalBooking}
            disabled={!calBookingUrl}
            aria-label={fr.onboarding.callAria}
          >
            {fr.onboarding.callCta}
          </Button>
          <Button variant="secondary" size="sm" onClick={goToHelp} aria-label={fr.onboarding.helpAria}>
            {fr.onboarding.helpCta}
          </Button>
        </div>
      </header>

      <ul role="list" className="mt-4 space-y-3">
        {steps.map((step) => {
          const Icon = stepIconByName(step.icon_name);
          const isDone = step.status === 'done';
          const isActive = step.status === 'active';
          const isLocked = step.status === 'locked';

          return (
            <li
              key={step.id}
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
              data-testid={`onboarding-step-${step.step_key}`}
              className={`
                rounded-xl border p-4 transition-colors
                ${isActive ? 'border-slate-900 bg-slate-50' : ''}
                ${isDone ? 'border-emerald-200 bg-emerald-50/50' : ''}
                ${isLocked ? 'border-slate-200 bg-slate-50' : ''}
              `}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`
                        inline-flex h-8 w-8 items-center justify-center rounded-lg
                        ${isDone ? 'bg-emerald-100 text-emerald-700' : ''}
                        ${isActive ? 'bg-slate-900 text-white' : ''}
                        ${isLocked ? 'bg-slate-200 text-slate-500' : ''}
                      `}
                    >
                      {isDone ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                    </span>
                    <div className="min-w-0">
                      <p
                        className={`
                          truncate text-sm font-semibold
                          ${isDone ? 'text-slate-700 line-through' : 'text-slate-900'}
                        `}
                      >
                        {step.title}
                      </p>
                      <p className="text-xs text-slate-600">{step.description}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={isDone ? 'success' : isActive ? 'active' : 'locked'}>
                      {step.estimate_label}
                    </Badge>
                    {isDone ? <Badge variant="success">{fr.onboarding.done}</Badge> : null}
                    {isLocked ? (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Lock size={12} />
                        {fr.onboarding.locked}
                      </span>
                    ) : null}
                  </div>
                </div>

                {!isDone ? (
                  <div className="w-full md:w-auto">
                    <Button
                      fullWidth
                      variant={isActive ? 'primary' : 'secondary'}
                      disabled={isLocked}
                      onClick={() => runStepAction(step.cta_page, step.cta_external_url)}
                      aria-label={step.cta_label || fr.onboarding.openAriaFallback}
                      data-testid={`onboarding-step-cta-${step.step_key}`}
                      className="md:w-auto"
                    >
                      {step.cta_label || fr.onboarding.openDefault}
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
