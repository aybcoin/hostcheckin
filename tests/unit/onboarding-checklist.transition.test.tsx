import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OnboardingChecklistCard } from '../../src/components/OnboardingChecklist';
import type { OnboardingViewStep } from '../../src/hooks/useOnboardingSteps';

const buildStep = (overrides: Partial<OnboardingViewStep>): OnboardingViewStep => ({
  id: `step-${overrides.step_key || 'x'}`,
  host_id: 'host-test',
  step_key: 'account_created',
  icon_name: 'shield-check',
  title: 'Compte créé',
  description: 'Votre espace est prêt.',
  estimate_label: '~1 min',
  position: 1,
  cta_label: null,
  cta_page: null,
  cta_external_url: null,
  depends_on_step_key: null,
  is_enabled: true,
  completed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  status: 'locked',
  isDone: false,
  ...overrides,
});

describe('OnboardingChecklistCard', () => {
  it('affiche la bannière terminée quand toutes les étapes passent à done', () => {
    const onNavigate = vi.fn();
    const firstRender = render(
      <OnboardingChecklistCard
        hostId="host-test"
        loading={false}
        error={null}
        isComplete={false}
        completedCount={1}
        onNavigate={onNavigate}
        steps={[
          buildStep({
            step_key: 'account_created',
            isDone: true,
            status: 'done',
            completed_at: new Date().toISOString(),
          }),
          buildStep({
            step_key: 'connect_property',
            icon_name: 'home',
            title: 'Connecter Airbnb ou ajouter un logement',
            cta_label: 'Ajouter un logement',
            cta_page: 'properties',
            position: 2,
            status: 'active',
          }),
        ]}
      />,
    );

    expect(screen.getByTestId('onboarding-checklist')).toBeInTheDocument();

    firstRender.rerender(
      <OnboardingChecklistCard
        hostId="host-test"
        loading={false}
        error={null}
        isComplete
        completedCount={2}
        onNavigate={onNavigate}
        steps={[
          buildStep({
            step_key: 'account_created',
            isDone: true,
            status: 'done',
            completed_at: new Date().toISOString(),
          }),
          buildStep({
            step_key: 'connect_property',
            icon_name: 'home',
            title: 'Connecter Airbnb ou ajouter un logement',
            cta_label: 'Ajouter un logement',
            cta_page: 'properties',
            position: 2,
            status: 'done',
            isDone: true,
            completed_at: new Date().toISOString(),
          }),
        ]}
      />,
    );

    expect(screen.getByTestId('onboarding-complete-banner')).toBeInTheDocument();
    expect(screen.getByText('Votre configuration est terminée.')).toBeInTheDocument();
  });
});
