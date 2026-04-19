import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AppPage } from '../lib/navigation';
import { supabase, type OnboardingStep, type Property } from '../lib/supabase';
import { fr } from '../lib/i18n/fr';

export type OnboardingStepStatus = 'done' | 'active' | 'locked';

export interface OnboardingViewStep extends OnboardingStep {
  status: OnboardingStepStatus;
  isDone: boolean;
}

interface UseOnboardingStepsParams {
  hostId: string | null;
  properties: Property[];
}

const DEFAULT_STEPS: Array<
  Pick<
    OnboardingStep,
    | 'step_key'
    | 'icon_name'
    | 'title'
    | 'description'
    | 'estimate_label'
    | 'position'
    | 'cta_label'
    | 'cta_page'
    | 'depends_on_step_key'
  > & { completed_at?: string | null }
> = [
  {
    step_key: fr.onboarding.steps.accountCreated.key,
    icon_name: fr.onboarding.steps.accountCreated.icon,
    title: fr.onboarding.steps.accountCreated.title,
    description: fr.onboarding.steps.accountCreated.description,
    estimate_label: fr.onboarding.steps.accountCreated.estimate,
    position: 1,
    cta_label: null,
    cta_page: null,
    depends_on_step_key: null,
    completed_at: new Date().toISOString(),
  },
  {
    step_key: fr.onboarding.steps.connectProperty.key,
    icon_name: fr.onboarding.steps.connectProperty.icon,
    title: fr.onboarding.steps.connectProperty.title,
    description: fr.onboarding.steps.connectProperty.description,
    estimate_label: fr.onboarding.steps.connectProperty.estimate,
    position: 2,
    cta_label: fr.onboarding.steps.connectProperty.cta,
    cta_page: 'properties',
    depends_on_step_key: fr.onboarding.steps.accountCreated.key,
  },
  {
    step_key: fr.onboarding.steps.customizeContract.key,
    icon_name: fr.onboarding.steps.customizeContract.icon,
    title: fr.onboarding.steps.customizeContract.title,
    description: fr.onboarding.steps.customizeContract.description,
    estimate_label: fr.onboarding.steps.customizeContract.estimate,
    position: 3,
    cta_label: fr.onboarding.steps.customizeContract.cta,
    cta_page: 'contracts',
    depends_on_step_key: fr.onboarding.steps.connectProperty.key,
  },
  {
    step_key: fr.onboarding.steps.enableAutoCheckin.key,
    icon_name: fr.onboarding.steps.enableAutoCheckin.icon,
    title: fr.onboarding.steps.enableAutoCheckin.title,
    description: fr.onboarding.steps.enableAutoCheckin.description,
    estimate_label: fr.onboarding.steps.enableAutoCheckin.estimate,
    position: 4,
    cta_label: fr.onboarding.steps.enableAutoCheckin.cta,
    cta_page: 'properties',
    depends_on_step_key: fr.onboarding.steps.customizeContract.key,
  },
];

export function useOnboardingSteps({ hostId, properties }: UseOnboardingStepsParams) {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [templatesCount, setTemplatesCount] = useState(0);
  const [autoCheckinCount, setAutoCheckinCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const seedDefaultSteps = useCallback(async (targetHostId: string) => {
    const payload = DEFAULT_STEPS.map((step) => ({
      host_id: targetHostId,
      step_key: step.step_key,
      icon_name: step.icon_name,
      title: step.title,
      description: step.description,
      estimate_label: step.estimate_label,
      position: step.position,
      cta_label: step.cta_label,
      cta_page: step.cta_page as AppPage | null,
      depends_on_step_key: step.depends_on_step_key,
      completed_at: step.completed_at || null,
      is_enabled: true,
    }));

    const { error: insertError } = await supabase
      .from('onboarding_steps')
      .upsert(payload, { onConflict: 'host_id,step_key' });

    if (insertError) {
      throw new Error(fr.onboarding.loadError);
    }
  }, []);

  const fetchCompletionSignals = useCallback(async (targetHostId: string) => {
    const [templatesResponse, autoCheckinResponse] = await Promise.all([
      supabase
        .from('contract_templates')
        .select('id', { count: 'exact', head: true })
        .eq('host_id', targetHostId),
      supabase
        .from('property_auto_links')
        .select('id', { count: 'exact', head: true })
        .eq('host_id', targetHostId)
        .eq('is_active', true),
    ]);

    if (templatesResponse.error || autoCheckinResponse.error) {
      throw new Error(fr.onboarding.loadError);
    }

    setTemplatesCount(templatesResponse.count || 0);
    setAutoCheckinCount(autoCheckinResponse.count || 0);
  }, []);

  const fetchSteps = useCallback(async () => {
    if (!hostId) {
      setLoading(false);
      setSteps([]);
      return;
    }

    setLoading(true);
    try {
      const initialQuery = await supabase
        .from('onboarding_steps')
        .select('*')
        .eq('host_id', hostId)
        .order('position', { ascending: true });
      let data = initialQuery.data;

      if (initialQuery.error) {
        throw initialQuery.error;
      }

      if (!data || data.length === 0) {
        await seedDefaultSteps(hostId);
        const seeded = await supabase
          .from('onboarding_steps')
          .select('*')
          .eq('host_id', hostId)
          .order('position', { ascending: true });

        if (seeded.error) {
          throw seeded.error;
        }
        data = seeded.data || [];
      }

      await fetchCompletionSignals(hostId);
      setSteps((data || []) as OnboardingStep[]);
      setError(null);
    } catch {
      setError(fr.onboarding.loadError);
    } finally {
      setLoading(false);
    }
  }, [fetchCompletionSignals, hostId, seedDefaultSteps]);

  useEffect(() => {
    void fetchSteps();
  }, [fetchSteps]);

  const completionSignalByKey = useMemo(() => {
    const map: Record<string, boolean> = {
      account_created: Boolean(hostId),
      // Decision: "Connecter Airbnb OU Ajouter un logement" is marked done as
      // soon as one property exists, because both actions reach the same outcome.
      connect_property: properties.length > 0,
      // Decision: contract onboarding is complete when at least one custom
      // template is saved for the host.
      customize_contract: templatesCount > 0,
      // Decision: automatic check-in is complete when at least one active
      // permanent link exists (property_auto_links).
      enable_auto_checkin: autoCheckinCount > 0,
    };
    return map;
  }, [autoCheckinCount, hostId, properties.length, templatesCount]);

  useEffect(() => {
    if (!hostId || steps.length === 0) return;

    const stepsToMarkDone = steps.filter(
      (step) => !step.completed_at && Boolean(completionSignalByKey[step.step_key]),
    );

    if (stepsToMarkDone.length === 0) return;

    const markDone = async () => {
      const completedAt = new Date().toISOString();
      await Promise.all(
        stepsToMarkDone.map(async (step) => {
          await supabase
            .from('onboarding_steps')
            .update({ completed_at: completedAt, updated_at: completedAt })
            .eq('id', step.id)
            .eq('host_id', hostId);
        }),
      );

      setSteps((previous) =>
        previous.map((step) => (
          stepsToMarkDone.some((candidate) => candidate.id === step.id)
            ? { ...step, completed_at: completedAt, updated_at: completedAt }
            : step
        )),
      );
    };

    void markDone();
  }, [completionSignalByKey, hostId, steps]);

  const viewSteps = useMemo<OnboardingViewStep[]>(() => {
    const enabledSteps = steps
      .filter((step) => step.is_enabled)
      .sort((a, b) => a.position - b.position)
      .slice(0, 5);

    const doneByKey = new Map<string, boolean>();
    enabledSteps.forEach((step) => {
      doneByKey.set(step.step_key, Boolean(step.completed_at) || Boolean(completionSignalByKey[step.step_key]));
    });

    let activeAssigned = false;
    return enabledSteps.map((step, index) => {
      const done = doneByKey.get(step.step_key) || false;
      const previousStep = enabledSteps[index - 1];
      const dependencyDone = step.depends_on_step_key
        ? Boolean(doneByKey.get(step.depends_on_step_key))
        : previousStep
          ? Boolean(doneByKey.get(previousStep.step_key))
          : true;

      let status: OnboardingStepStatus = 'locked';
      if (done) {
        status = 'done';
      } else if (!activeAssigned && dependencyDone) {
        status = 'active';
        activeAssigned = true;
      }

      return {
        ...step,
        isDone: done,
        status,
      };
    });
  }, [completionSignalByKey, steps]);

  const completedCount = viewSteps.filter((step) => step.isDone).length;
  const isComplete = viewSteps.length > 0 && completedCount === viewSteps.length;

  return {
    steps: viewSteps,
    loading,
    error,
    completedCount,
    isComplete,
    refetch: fetchSteps,
  };
}
