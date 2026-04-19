import type { Meta, StoryObj } from '@storybook/react';
import { OnboardingChecklistCard } from '../src/components/OnboardingChecklist';
import type { OnboardingViewStep } from '../src/hooks/useOnboardingSteps';

const baseStep = (step: Partial<OnboardingViewStep>): OnboardingViewStep => ({
  id: `step-${step.step_key || 'x'}`,
  host_id: 'host-story',
  step_key: 'account_created',
  icon_name: 'shield-check',
  title: 'Étape',
  description: 'Description',
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
  ...step,
});

const meta: Meta<typeof OnboardingChecklistCard> = {
  title: 'Dashboard/OnboardingChecklist',
  component: OnboardingChecklistCard,
  args: {
    hostId: 'host-story',
    loading: false,
    error: null,
    isComplete: false,
    completedCount: 1,
    onNavigate: () => undefined,
  },
};

export default meta;

type Story = StoryObj<typeof OnboardingChecklistCard>;

export const ActiveStep: Story = {
  args: {
    steps: [
      baseStep({
        step_key: 'account_created',
        title: 'Compte créé',
        isDone: true,
        status: 'done',
        completed_at: new Date().toISOString(),
      }),
      baseStep({
        step_key: 'connect_property',
        icon_name: 'home',
        title: 'Connecter Airbnb ou ajouter un logement',
        description: 'Importez Airbnb ou ajoutez votre premier logement.',
        cta_label: 'Ajouter un logement',
        cta_page: 'properties',
        position: 2,
        status: 'active',
      }),
      baseStep({
        step_key: 'customize_contract',
        icon_name: 'file-text',
        title: 'Personnaliser mon contrat',
        cta_label: 'Configurer mon contrat',
        cta_page: 'contracts',
        position: 3,
        status: 'locked',
      }),
    ],
  },
};

export const LockedTail: Story = {
  args: {
    completedCount: 2,
    steps: [
      baseStep({
        step_key: 'account_created',
        title: 'Compte créé',
        isDone: true,
        status: 'done',
        completed_at: new Date().toISOString(),
      }),
      baseStep({
        step_key: 'connect_property',
        icon_name: 'home',
        title: 'Connecter Airbnb ou ajouter un logement',
        isDone: true,
        status: 'done',
        position: 2,
        completed_at: new Date().toISOString(),
      }),
      baseStep({
        step_key: 'customize_contract',
        icon_name: 'file-text',
        title: 'Personnaliser mon contrat',
        position: 3,
        cta_label: 'Configurer mon contrat',
        cta_page: 'contracts',
        status: 'active',
      }),
      baseStep({
        step_key: 'enable_auto_checkin',
        icon_name: 'qr-code',
        title: 'Activer le check-in automatique',
        position: 4,
        cta_label: 'Activer maintenant',
        cta_page: 'properties',
        status: 'locked',
      }),
    ],
  },
};

export const CompletedBanner: Story = {
  args: {
    isComplete: true,
    completedCount: 4,
    steps: [
      baseStep({
        step_key: 'account_created',
        title: 'Compte créé',
        isDone: true,
        status: 'done',
        completed_at: new Date().toISOString(),
      }),
      baseStep({
        step_key: 'connect_property',
        icon_name: 'home',
        title: 'Connecter Airbnb ou ajouter un logement',
        isDone: true,
        status: 'done',
        position: 2,
        completed_at: new Date().toISOString(),
      }),
      baseStep({
        step_key: 'customize_contract',
        icon_name: 'file-text',
        title: 'Personnaliser mon contrat',
        isDone: true,
        status: 'done',
        position: 3,
        completed_at: new Date().toISOString(),
      }),
      baseStep({
        step_key: 'enable_auto_checkin',
        icon_name: 'qr-code',
        title: 'Activer le check-in automatique',
        isDone: true,
        status: 'done',
        position: 4,
        completed_at: new Date().toISOString(),
      }),
    ],
  },
};
